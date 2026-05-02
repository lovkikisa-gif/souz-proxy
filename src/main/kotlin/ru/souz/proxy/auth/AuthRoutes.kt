package ru.souz.proxy.auth

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.plugins.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import ru.souz.proxy.app.ProxyConfig
import ru.souz.proxy.http.ErrorDto
import ru.souz.proxy.http.ErrorEnvelope
import ru.souz.proxy.security.AttemptRateLimiter

fun Route.authRoutes(
    authService: AuthServicePort,
    config: ProxyConfig,
    rateLimiter: AttemptRateLimiter
) {

    post("/auth/welcome/verify") {
        val req = call.receive<VerifyWelcomeKeyRequest>()
        val clientIp = clientIp(call)
        rateLimiter.checkOrThrow("auth:welcome-verify:ip:$clientIp")
        rateLimiter.checkOrThrow("auth:welcome-verify:key:${req.welcomeKey.trim()}")
        val isValid = try {
            authService.verifyWelcomeKey(req.welcomeKey)
        } catch (e: Exception) {
            false
        }
        
        if (isValid) {
            call.respond(VerifyWelcomeKeyResponse(valid = true))
        } else {
            call.respond(
                HttpStatusCode.BadRequest,
                ErrorEnvelope(ErrorDto("invalid_welcome_key", "Welcome key is invalid, expired or already used."))
            )
        }
    }

    post("/auth/signup") {
        val req = call.receive<SignupRequest>()
        val clientIp = clientIp(call)
        rateLimiter.checkOrThrow("auth:signup:ip:$clientIp")
        rateLimiter.checkOrThrow("auth:signup:username:${req.username.trim().lowercase()}")
        if (req.password != req.confirmPassword) {
            call.respond(
                HttpStatusCode.BadRequest,
                ErrorEnvelope(ErrorDto("validation_error", "Passwords do not match."))
            )
            return@post
        }
        if (req.password.length < 8 || req.password.length > 128) {
            call.respond(
                HttpStatusCode.BadRequest,
                ErrorEnvelope(ErrorDto("validation_error", "Password must be between 8 and 128 characters."))
            )
            return@post
        }
        if (!req.username.matches(Regex("^[a-zA-Z0-9_.-]{3,32}$"))) {
             call.respond(
                HttpStatusCode.BadRequest,
                ErrorEnvelope(ErrorDto("validation_error", "Invalid username format."))
            )
            return@post
        }

        val userAgent = call.request.headers[HttpHeaders.UserAgent]
        val ipHash = clientIp

        val res = authService.signup(req, userAgent, ipHash)
        setSessionCookie(call, config, res.rawSessionToken)
        call.respond(AuthResponse(res.user))
    }

    post("/auth/login") {
        val req = call.receive<LoginRequest>()
        val clientIp = clientIp(call)
        rateLimiter.checkOrThrow("auth:login:ip:$clientIp")
        rateLimiter.checkOrThrow("auth:login:username:${req.username.trim().lowercase()}")
        val userAgent = call.request.headers[HttpHeaders.UserAgent]
        val ipHash = clientIp

        val res = authService.login(req, userAgent, ipHash)
        setSessionCookie(call, config, res.rawSessionToken)
        call.respond(AuthResponse(res.user))
    }

    post("/auth/logout") {
        val token = call.request.cookies[config.cookieName]
        if (token != null) {
            authService.logout(token)
        }
        clearSessionCookie(call, config)
        call.respond(SimpleSuccessResponse(ok = true))
    }

    get("/auth/me") {
        val token = call.request.cookies[config.cookieName]
        if (token == null) {
            call.respond(
                HttpStatusCode.Unauthorized,
                ErrorEnvelope(ErrorDto("unauthorized", "Authentication required."))
            )
            return@get
        }

        val user = authService.getMe(token)
        call.respond(AuthResponse(user))
    }
}

private fun setSessionCookie(call: ApplicationCall, config: ProxyConfig, token: String) {
    call.response.cookies.append(
        Cookie(
            name = config.cookieName,
            value = token,
            httpOnly = true,
            secure = config.cookieSecure,
            path = "/",
            maxAge = (config.sessionTtlDays * 24 * 60 * 60).toInt(),
            extensions = mapOf("SameSite" to "Lax")
        )
    )
}

private fun clearSessionCookie(call: ApplicationCall, config: ProxyConfig) {
    call.response.cookies.append(
        Cookie(
            name = config.cookieName,
            value = "",
            httpOnly = true,
            secure = config.cookieSecure,
            path = "/",
            maxAge = 0,
            extensions = mapOf("SameSite" to "Lax")
        )
    )
}

private fun clientIp(call: ApplicationCall): String {
    return call.request.local.remoteHost
        .takeIf { it.isNotBlank() }
        ?: call.request.origin.remoteHost.takeIf { it.isNotBlank() }
        ?: "unknown"
}
