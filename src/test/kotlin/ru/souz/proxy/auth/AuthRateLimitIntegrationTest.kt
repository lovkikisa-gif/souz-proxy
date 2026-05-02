package ru.souz.proxy.auth

import io.ktor.client.call.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.testing.*
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import ru.souz.proxy.app.ProxyConfig
import ru.souz.proxy.app.proxyModule
import ru.souz.proxy.http.ErrorEnvelope
import ru.souz.proxy.security.InMemoryAttemptRateLimiter
import java.time.Duration
import java.util.concurrent.atomic.AtomicInteger

class AuthRateLimitIntegrationTest {
    @Test
    fun `login is rate limited by ip and username`() = testApplication {
        val loginCalls = AtomicInteger()
        application {
            proxyModule(
                config = testConfig(),
                authService = FakeAuthService(
                    loginBlock = { _, _, _ ->
                        loginCalls.incrementAndGet()
                        throw AuthException("invalid_credentials", "Invalid username or password.")
                    }
                ),
                rateLimiter = InMemoryAttemptRateLimiter(maxAttempts = 2, window = Duration.ofMinutes(5))
            )
        }

        val client = createJsonClient()
        repeat(2) {
            val response = client.post("/auth/login") {
                contentType(ContentType.Application.Json)
                setBody(LoginRequest(username = "alice", password = "bad-password"))
            }
            assertEquals(HttpStatusCode.BadRequest, response.status)
        }

        val limited = client.post("/auth/login") {
            contentType(ContentType.Application.Json)
            setBody(LoginRequest(username = "alice", password = "bad-password"))
        }

        assertEquals(HttpStatusCode.TooManyRequests, limited.status)
        assertEquals("rate_limited", limited.body<ErrorEnvelope>().error.code)
        assertEquals(2, loginCalls.get())
    }

    @Test
    fun `signup is rate limited by ip and username`() = testApplication {
        val signupCalls = AtomicInteger()
        application {
            proxyModule(
                config = testConfig(),
                authService = FakeAuthService(
                    signupBlock = { request, _, _ ->
                        signupCalls.incrementAndGet()
                        AuthResponseWithCookie(
                            user = AuthUserDto(id = "user-1", username = request.username),
                            rawSessionToken = "session-token"
                        )
                    }
                ),
                rateLimiter = InMemoryAttemptRateLimiter(maxAttempts = 2, window = Duration.ofMinutes(5))
            )
        }

        val client = createJsonClient()
        repeat(2) {
            val response = client.post("/auth/signup") {
                contentType(ContentType.Application.Json)
                setBody(
                    SignupRequest(
                        welcomeKey = "welcome-key",
                        username = "alice",
                        password = "super-secret-password",
                        confirmPassword = "super-secret-password"
                    )
                )
            }
            assertEquals(HttpStatusCode.OK, response.status)
        }

        val limited = client.post("/auth/signup") {
            contentType(ContentType.Application.Json)
            setBody(
                SignupRequest(
                    welcomeKey = "welcome-key",
                    username = "alice",
                    password = "super-secret-password",
                    confirmPassword = "super-secret-password"
                )
            )
        }

        assertEquals(HttpStatusCode.TooManyRequests, limited.status)
        assertEquals("rate_limited", limited.body<ErrorEnvelope>().error.code)
        assertEquals(2, signupCalls.get())
    }

    @Test
    fun `welcome verify is rate limited by ip and key`() = testApplication {
        val verifyCalls = AtomicInteger()
        application {
            proxyModule(
                config = testConfig(),
                authService = FakeAuthService(
                    verifyWelcomeKeyBlock = {
                        verifyCalls.incrementAndGet()
                        false
                    }
                ),
                rateLimiter = InMemoryAttemptRateLimiter(maxAttempts = 2, window = Duration.ofMinutes(5))
            )
        }

        val client = createJsonClient()
        repeat(2) {
            val response = client.post("/auth/welcome/verify") {
                contentType(ContentType.Application.Json)
                setBody(VerifyWelcomeKeyRequest(welcomeKey = "welcome-key"))
            }
            assertEquals(HttpStatusCode.BadRequest, response.status)
        }

        val limited = client.post("/auth/welcome/verify") {
            contentType(ContentType.Application.Json)
            setBody(VerifyWelcomeKeyRequest(welcomeKey = "welcome-key"))
        }

        assertEquals(HttpStatusCode.TooManyRequests, limited.status)
        assertEquals("rate_limited", limited.body<ErrorEnvelope>().error.code)
        assertEquals(2, verifyCalls.get())
    }

    private fun ApplicationTestBuilder.createJsonClient() = createClient {
        install(io.ktor.client.plugins.contentnegotiation.ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
            })
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
        env = "test"
    )
}

private class FakeAuthService(
    private val verifyWelcomeKeyBlock: (String) -> Boolean = { true },
    private val signupBlock: (SignupRequest, String?, String?) -> AuthResponseWithCookie = { request, _, _ ->
        AuthResponseWithCookie(
            user = AuthUserDto(id = "user-1", username = request.username),
            rawSessionToken = "session-token"
        )
    },
    private val loginBlock: (LoginRequest, String?, String?) -> AuthResponseWithCookie = { request, _, _ ->
        AuthResponseWithCookie(
            user = AuthUserDto(id = "user-1", username = request.username),
            rawSessionToken = "session-token"
        )
    },
    private val sessionLookup: (String) -> String? = { null }
) : AuthServicePort {
    override fun verifyWelcomeKey(rawKey: String): Boolean = verifyWelcomeKeyBlock(rawKey)

    override fun signup(req: SignupRequest, userAgent: String?, ipHash: String?): AuthResponseWithCookie {
        return signupBlock(req, userAgent, ipHash)
    }

    override fun login(req: LoginRequest, userAgent: String?, ipHash: String?): AuthResponseWithCookie {
        return loginBlock(req, userAgent, ipHash)
    }

    override fun logout(rawSessionToken: String) = Unit

    override fun getMe(rawSessionToken: String): AuthUserDto {
        val userId = sessionLookup(rawSessionToken) ?: throw AuthException("unauthorized", "Authentication required.")
        return AuthUserDto(id = userId, username = "user-$userId")
    }

    override fun getUserIdBySessionToken(rawSessionToken: String): String? = sessionLookup(rawSessionToken)
}
