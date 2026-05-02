package ru.souz.proxy.app

import io.ktor.client.*
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.plugins.callloging.*
import io.ktor.server.plugins.compression.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.forwardedheaders.*
import io.ktor.server.plugins.statuspages.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import kotlinx.serialization.json.Json
import org.slf4j.event.Level
import ru.souz.proxy.auth.AuthException
import ru.souz.proxy.auth.AuthServicePort
import ru.souz.proxy.auth.authRoutes
import ru.souz.proxy.db.DatabaseFactory
import ru.souz.proxy.http.ErrorDto
import ru.souz.proxy.http.ErrorEnvelope
import ru.souz.proxy.http.ReadinessSnapshot
import ru.souz.proxy.http.healthRoutes
import ru.souz.proxy.http.staticRoutes
import ru.souz.proxy.proxy.buildProxyHttpClient
import ru.souz.proxy.proxy.reverseProxyRoutes
import ru.souz.proxy.security.AttemptRateLimiter
import ru.souz.proxy.security.InMemoryAttemptRateLimiter
import ru.souz.proxy.security.RateLimitExceededException

fun Application.proxyModule(
    config: ProxyConfig,
    authService: AuthServicePort,
    proxyHttpClient: HttpClient? = null,
    rateLimiter: AttemptRateLimiter = InMemoryAttemptRateLimiter(
        maxAttempts = config.authRateLimitMaxAttempts,
        window = config.authRateLimitWindow
    ),
    databaseReadyCheck: () -> Boolean = { DatabaseFactory.isReady() }
) {
    val ownedClient = proxyHttpClient ?: buildProxyHttpClient(config)
    if (proxyHttpClient == null) {
        environment.monitor.subscribe(ApplicationStopped) {
            ownedClient.close()
        }
    }

    install(ContentNegotiation) {
        json(Json {
            ignoreUnknownKeys = true
            encodeDefaults = true
        })
    }

    install(CallLogging) {
        level = Level.INFO
    }

    install(WebSockets) {
        pingPeriod = config.wsPingPeriod
        timeout = config.wsIdleTimeout
        maxFrameSize = config.wsMaxFrameSizeBytes
        masking = false
    }

    install(XForwardedHeaders)
    install(ForwardedHeaders)
    install(Compression)

    install(StatusPages) {
        exception<AuthException> { call, cause ->
            val status = if (cause.code == "unauthorized") HttpStatusCode.Unauthorized else HttpStatusCode.BadRequest
            call.respond(status, ErrorEnvelope(ErrorDto(cause.code, cause.message ?: "Error")))
        }
        exception<RateLimitExceededException> { call, cause ->
            call.response.headers.append(HttpHeaders.RetryAfter, config.authRateLimitWindow.seconds.toString())
            call.respond(
                HttpStatusCode.TooManyRequests,
                ErrorEnvelope(ErrorDto("rate_limited", cause.message ?: "Too many requests."))
            )
        }
        exception<Throwable> { call, cause ->
            call.application.environment.log.error("Unhandled exception", cause)
            call.respond(
                HttpStatusCode.InternalServerError,
                ErrorEnvelope(ErrorDto("internal_error", "An internal error occurred."))
            )
        }
    }

    routing {
        healthRoutes {
            buildReadinessSnapshot(config, ownedClient, databaseReadyCheck)
        }
        authRoutes(authService, config, rateLimiter)
        reverseProxyRoutes(authService, config, ownedClient)
        staticRoutes()
    }
}

private suspend fun buildReadinessSnapshot(
    config: ProxyConfig,
    client: HttpClient,
    databaseReadyCheck: () -> Boolean
): ReadinessSnapshot {
    val databaseReady = runCatching { databaseReadyCheck() }.getOrDefault(false)
    val backendReady = runCatching {
        client.get("${config.backendUrl.trimEnd('/')}/health").status.isSuccess()
    }.getOrDefault(false)

    return ReadinessSnapshot(
        ready = databaseReady && backendReady,
        checks = mapOf(
            "database" to if (databaseReady) "ok" else "error",
            "backend" to if (backendReady) "ok" else "error"
        )
    )
}
