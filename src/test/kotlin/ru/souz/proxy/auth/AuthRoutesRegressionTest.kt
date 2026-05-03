package ru.souz.proxy.auth

import io.ktor.client.call.body
import io.ktor.client.request.cookie
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import io.ktor.server.testing.ApplicationTestBuilder
import io.ktor.server.testing.testApplication
import java.util.concurrent.atomic.AtomicReference
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlinx.serialization.json.Json
import ru.souz.proxy.app.ProxyConfig
import ru.souz.proxy.app.proxyModule
import ru.souz.proxy.http.ErrorEnvelope

class AuthRoutesRegressionTest {
    @Test
    fun `login returns authenticated user and session cookie`() = testApplication {
        application {
            proxyModule(
                config = testConfig(),
                authService = RegressionAuthService(
                    loginBlock = { request, _, _ ->
                        AuthResponseWithCookie(
                            user = AuthUserDto(id = "user-1", username = request.username),
                            rawSessionToken = "login-session-token",
                        )
                    },
                ),
            )
        }

        val response = createJsonClient().post("/auth/login") {
            contentType(ContentType.Application.Json)
            setBody(LoginRequest(username = "alice", password = "super-secret-password"))
        }
        val body = response.body<AuthResponse>()
        val setCookie = response.headers.getAll(HttpHeaders.SetCookie).orEmpty()

        assertEquals(HttpStatusCode.OK, response.status)
        assertEquals("user-1", body.user.id)
        assertEquals("alice", body.user.username)
        assertTrue(setCookie.any { it.contains("souz_session=login-session-token") })
        assertTrue(setCookie.any { it.contains("HttpOnly") })
    }

    @Test
    fun `signup returns authenticated user and session cookie`() = testApplication {
        application {
            proxyModule(
                config = testConfig(),
                authService = RegressionAuthService(
                    signupBlock = { request, _, _ ->
                        AuthResponseWithCookie(
                            user = AuthUserDto(id = "user-2", username = request.username),
                            rawSessionToken = "signup-session-token",
                        )
                    },
                ),
            )
        }

        val response = createJsonClient().post("/auth/signup") {
            contentType(ContentType.Application.Json)
            setBody(
                SignupRequest(
                    welcomeKey = "welcome-key",
                    username = "new-user",
                    password = "super-secret-password",
                    confirmPassword = "super-secret-password",
                ),
            )
        }
        val body = response.body<AuthResponse>()
        val setCookie = response.headers.getAll(HttpHeaders.SetCookie).orEmpty()

        assertEquals(HttpStatusCode.OK, response.status)
        assertEquals("user-2", body.user.id)
        assertEquals("new-user", body.user.username)
        assertTrue(setCookie.any { it.contains("souz_session=signup-session-token") })
    }

    @Test
    fun `auth me requires session cookie and returns current user when present`() = testApplication {
        application {
            proxyModule(
                config = testConfig(),
                authService = RegressionAuthService(
                    sessionLookup = { token -> if (token == "valid-session-token") "user-3" else null },
                ),
            )
        }

        val unauthorized = createJsonClient().get("/auth/me")
        val authorized = createJsonClient().get("/auth/me") {
            cookie("souz_session", "valid-session-token")
        }

        assertEquals(HttpStatusCode.Unauthorized, unauthorized.status)
        assertEquals("unauthorized", unauthorized.body<ErrorEnvelope>().error.code)
        assertEquals(HttpStatusCode.OK, authorized.status)
        assertEquals("user-3", authorized.body<AuthResponse>().user.id)
    }

    @Test
    fun `logout clears session cookie and revokes current session when present`() = testApplication {
        val revokedSession = AtomicReference<String?>(null)
        application {
            proxyModule(
                config = testConfig(),
                authService = RegressionAuthService(
                    logoutBlock = { rawToken -> revokedSession.set(rawToken) },
                ),
            )
        }

        val response = createJsonClient().post("/auth/logout") {
            cookie("souz_session", "logout-session-token")
        }
        val setCookie = response.headers.getAll(HttpHeaders.SetCookie).orEmpty()

        assertEquals(HttpStatusCode.OK, response.status)
        assertEquals("logout-session-token", revokedSession.get())
        assertTrue(setCookie.any { it.contains("souz_session=") })
    }

    @Test
    fun `welcome key verify still returns validation response`() = testApplication {
        application {
            proxyModule(
                config = testConfig(),
                authService = RegressionAuthService(
                    verifyWelcomeKeyBlock = { it == "valid-welcome-key" },
                ),
            )
        }

        val valid = createJsonClient().post("/auth/welcome/verify") {
            contentType(ContentType.Application.Json)
            setBody(VerifyWelcomeKeyRequest(welcomeKey = "valid-welcome-key"))
        }
        val invalid = createJsonClient().post("/auth/welcome/verify") {
            contentType(ContentType.Application.Json)
            setBody(VerifyWelcomeKeyRequest(welcomeKey = "invalid-welcome-key"))
        }

        assertEquals(HttpStatusCode.OK, valid.status)
        assertEquals(true, valid.body<VerifyWelcomeKeyResponse>().valid)
        assertEquals(HttpStatusCode.BadRequest, invalid.status)
        assertEquals("invalid_welcome_key", invalid.body<ErrorEnvelope>().error.code)
    }

    private fun ApplicationTestBuilder.createJsonClient() = createClient {
        install(io.ktor.client.plugins.contentnegotiation.ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true })
        }
    }

    private fun testConfig() = ProxyConfig(
        host = "127.0.0.1",
        port = 8080,
        publicBaseUrl = "https://proxy.example.test",
        databaseUrl = "jdbc:postgresql://localhost:5432/souz_proxy",
        backendUrl = "http://backend.internal:8080",
        backendProxyToken = "proxy-token-0123456789abcdef0123456789abcdef",
        sessionHashSecret = "session-secret-0123456789abcdef0123456789",
        welcomeKeySecret = "welcome-secret-0123456789abcdef012345678",
        cookieName = "souz_session",
        cookieSecure = true,
        sessionTtlDays = 30,
        env = "test",
    )
}

private class RegressionAuthService(
    private val verifyWelcomeKeyBlock: (String) -> Boolean = { true },
    private val signupBlock: (SignupRequest, String?, String?) -> AuthResponseWithCookie = { request, _, _ ->
        AuthResponseWithCookie(
            user = AuthUserDto(id = "user-1", username = request.username),
            rawSessionToken = "signup-session-token",
        )
    },
    private val loginBlock: (LoginRequest, String?, String?) -> AuthResponseWithCookie = { request, _, _ ->
        AuthResponseWithCookie(
            user = AuthUserDto(id = "user-1", username = request.username),
            rawSessionToken = "login-session-token",
        )
    },
    private val logoutBlock: (String) -> Unit = {},
    private val sessionLookup: (String) -> String? = { null },
) : AuthServicePort {
    override fun verifyWelcomeKey(rawKey: String): Boolean = verifyWelcomeKeyBlock(rawKey)

    override fun signup(req: SignupRequest, userAgent: String?, ipHash: String?): AuthResponseWithCookie =
        signupBlock(req, userAgent, ipHash)

    override fun login(req: LoginRequest, userAgent: String?, ipHash: String?): AuthResponseWithCookie =
        loginBlock(req, userAgent, ipHash)

    override fun logout(rawSessionToken: String) {
        logoutBlock(rawSessionToken)
    }

    override fun getMe(rawSessionToken: String): AuthUserDto {
        val userId = sessionLookup(rawSessionToken) ?: throw AuthException("unauthorized", "Authentication required.")
        return AuthUserDto(id = userId, username = "user-$userId")
    }

    override fun getUserIdBySessionToken(rawSessionToken: String): String? = sessionLookup(rawSessionToken)
}
