package ru.souz.proxy.proxy

import io.ktor.client.call.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.plugins.websocket.WebSockets as ClientWebSockets
import io.ktor.client.plugins.websocket.webSocketSession
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.testing.*
import io.ktor.server.websocket.DefaultWebSocketServerSession
import io.ktor.server.websocket.WebSockets as ServerWebSockets
import io.ktor.server.websocket.webSocket
import io.ktor.utils.io.*
import io.ktor.utils.io.core.*
import io.ktor.websocket.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import ru.souz.proxy.app.ProxyConfig
import ru.souz.proxy.app.proxyModule
import ru.souz.proxy.auth.AuthResponseWithCookie
import ru.souz.proxy.auth.AuthServicePort
import ru.souz.proxy.auth.AuthUserDto
import ru.souz.proxy.auth.LoginRequest
import ru.souz.proxy.auth.SignupRequest
import ru.souz.proxy.http.HealthResponse
import java.net.ServerSocket
import java.util.concurrent.atomic.AtomicReference

class ProxyIntegrationTest {
    @Test
    fun `unauthenticated v1 request returns 401`() = withBackendServer { backend ->
        testApplication {
            application {
                proxyModule(
                    config = testConfig(backend.baseUrl),
                    authService = BackendAuthService()
                )
            }

            val response = createJsonClient().get("/v1/bootstrap")

            assertEquals(HttpStatusCode.Unauthorized, response.status)
        }
    }

    @Test
    fun `spoofed proxy headers are stripped and proxy identity headers are injected`() = withBackendServer { backend ->
        testApplication {
            application {
                proxyModule(
                    config = testConfig(backend.baseUrl),
                    authService = BackendAuthService(sessionLookup = { "proxy-user-123" })
                )
            }

            val response = createJsonClient().post("/v1/me/settings") {
                cookie("souz_session", "valid-session")
                header("X-User-Id", "attacker")
                header("X-Souz-Proxy-Auth", "attacker-token")
                contentType(ContentType.Application.Json)
                setBody("""{"theme":"light"}""")
            }

            assertEquals(HttpStatusCode.OK, response.status)

            val echoed = response.body<BackendEchoResponse>()
            assertEquals("proxy-user-123", echoed.headers["X-User-Id"])
            assertEquals("proxy-token-0123456789abcdef0123456789abcdef", echoed.headers["X-Souz-Proxy-Auth"])
            assertEquals(null, echoed.headers["Cookie"])
        }
    }

    @Test
    fun `backend receives json body with content length`() = withBackendServer { backend ->
        testApplication {
            application {
                proxyModule(
                    config = testConfig(backend.baseUrl),
                    authService = BackendAuthService(sessionLookup = { "proxy-user-123" })
                )
            }

            val payload = """{"message":"hello"}"""
            val response = createJsonClient().post("/v1/chats") {
                cookie("souz_session", "valid-session")
                contentType(ContentType.Application.Json)
                setBody(payload)
            }

            assertEquals(HttpStatusCode.OK, response.status)
            assertEquals(payload, response.body<BackendEchoResponse>().body)
        }
    }

    @Test
    fun `backend receives chunked json body`() = withBackendServer { backend ->
        testApplication {
            application {
                proxyModule(
                    config = testConfig(backend.baseUrl),
                    authService = BackendAuthService(sessionLookup = { "proxy-user-123" })
                )
            }

            val payload = """{"message":"chunked"}"""
            val response = createJsonClient().post("/v1/chats") {
                cookie("souz_session", "valid-session")
                contentType(ContentType.Application.Json)
                setBody(object : io.ktor.http.content.OutgoingContent.WriteChannelContent() {
                    override suspend fun writeTo(channel: ByteWriteChannel) {
                        channel.writeStringUtf8(payload)
                    }
                })
            }

            assertEquals(HttpStatusCode.OK, response.status)
            assertEquals(payload, response.body<BackendEchoResponse>().body)
        }
    }

    @Test
    fun `telegram bot put request is proxied with same path body and trusted headers`() = withBackendServer { backend ->
        testApplication {
            application {
                proxyModule(
                    config = testConfig(backend.baseUrl),
                    authService = BackendAuthService(sessionLookup = { "proxy-user-123" })
                )
            }

            val payload = """{"token":"123456:ABCDEF"}"""
            val response = createJsonClient().put("/v1/chats/chat-42/telegram-bot") {
                cookie("souz_session", "valid-session")
                contentType(ContentType.Application.Json)
                header(HttpHeaders.Authorization, "Bearer attacker")
                header("X-Forwarded-For", "1.2.3.4")
                header("X-User-Id", "attacker")
                header("X-Souz-Proxy-Auth", "attacker-token")
                setBody(payload)
            }

            assertEquals(HttpStatusCode.OK, response.status)

            val echoed = response.body<BackendEchoResponse>()
            assertEquals("PUT", echoed.method)
            assertEquals("/v1/chats/chat-42/telegram-bot", echoed.path)
            assertEquals(payload, echoed.body)
            assertEquals("proxy-user-123", echoed.headers["X-User-Id"])
            assertEquals("proxy-token-0123456789abcdef0123456789abcdef", echoed.headers["X-Souz-Proxy-Auth"])
            assertEquals(null, echoed.headers[HttpHeaders.Authorization])
            assertEquals(null, echoed.headers["X-Forwarded-For"])
            assertEquals(null, echoed.headers[HttpHeaders.Cookie])
        }
    }

    @Test
    fun `telegram bot delete request is proxied with same path`() = withBackendServer { backend ->
        testApplication {
            application {
                proxyModule(
                    config = testConfig(backend.baseUrl),
                    authService = BackendAuthService(sessionLookup = { "proxy-user-123" })
                )
            }

            val response = createJsonClient().delete("/v1/chats/chat-42/telegram-bot") {
                cookie("souz_session", "valid-session")
            }

            assertEquals(HttpStatusCode.OK, response.status)

            val echoed = response.body<BackendEchoResponse>()
            assertEquals("DELETE", echoed.method)
            assertEquals("/v1/chats/chat-42/telegram-bot", echoed.path)
            assertEquals("", echoed.body)
        }
    }

    @Test
    fun `websocket requires auth`() = withBackendServer { backend ->
        testApplication {
            application {
                proxyModule(
                    config = testConfig(backend.baseUrl),
                    authService = BackendAuthService()
                )
            }

            val session = createWsClient().webSocketSession("/v1/chats/chat-1/ws")
            val closeReason = session.closeReason.await()

            assertNotNull(closeReason)
            assertEquals(CloseReason.Codes.VIOLATED_POLICY.code, closeReason.code)
        }
    }

    @Test
    fun `websocket rejects disallowed origin`() = withBackendServer { backend ->
        testApplication {
            application {
                proxyModule(
                    config = testConfig(backend.baseUrl),
                    authService = BackendAuthService(sessionLookup = { "proxy-user-123" })
                )
            }

            val session = createWsClient().webSocketSession("/v1/chats/chat-1/ws") {
                cookie("souz_session", "valid-session")
                header(HttpHeaders.Origin, "https://evil.example.test")
            }
            val closeReason = session.closeReason.await()

            assertNotNull(closeReason)
            assertEquals(CloseReason.Codes.VIOLATED_POLICY.code, closeReason.code)
        }
    }

    @Test
    fun `websocket proxies frames injects auth headers and propagates backend close`() = withBackendServer(
        wsBehavior = { session, headers ->
            session.send(Frame.Text("backend-ready"))
            assertEquals("proxy-user-123", headers["X-User-Id"])
            assertEquals("proxy-token-0123456789abcdef0123456789abcdef", headers["X-Souz-Proxy-Auth"])
            val incomingFrame = session.incoming.receive() as Frame.Text
            session.send(Frame.Text("echo:${incomingFrame.readText()}"))
            session.close(CloseReason(CloseReason.Codes.NORMAL, "backend-finished"))
        }
    ) { backend ->
        testApplication {
            application {
                proxyModule(
                    config = testConfig(backend.baseUrl),
                    authService = BackendAuthService(sessionLookup = { "proxy-user-123" })
                )
            }

            val session = createWsClient().webSocketSession("/v1/chats/chat-1/ws") {
                cookie("souz_session", "valid-session")
                header(HttpHeaders.Origin, "https://proxy.example.test")
            }

            val firstFrame = session.incoming.receive() as Frame.Text
            assertEquals("backend-ready", firstFrame.readText())

            session.send(Frame.Text("hello"))
            val echoed = session.incoming.receive() as Frame.Text
            assertEquals("echo:hello", echoed.readText())

            val closeReason = session.closeReason.await()
            assertNotNull(closeReason)
            assertEquals(CloseReason.Codes.NORMAL.code, closeReason.code)
            assertEquals("backend-finished", closeReason.message)
        }
    }
}

private fun ApplicationTestBuilder.createJsonClient() = createClient {
    install(ContentNegotiation) {
        json(Json {
            ignoreUnknownKeys = true
        })
    }
}

private fun ApplicationTestBuilder.createWsClient() = createClient {
    install(ContentNegotiation) {
        json(Json {
            ignoreUnknownKeys = true
        })
    }
    install(ClientWebSockets)
}

private fun testConfig(backendUrl: String) = ProxyConfig(
    host = "127.0.0.1",
    port = 8080,
    publicBaseUrl = "https://proxy.example.test",
    databaseUrl = "jdbc:postgresql://localhost:5432/souz_proxy",
    backendUrl = backendUrl,
    backendProxyToken = "proxy-token-0123456789abcdef0123456789abcdef",
    sessionHashSecret = "session-secret-0123456789abcdef0123456789",
    welcomeKeySecret = "welcome-secret-0123456789abcdef012345678",
    cookieName = "souz_session",
    cookieSecure = true,
    sessionTtlDays = 30,
    env = "test"
)

private class BackendAuthService(
    private val sessionLookup: (String) -> String? = { null }
) : AuthServicePort {
    override fun verifyWelcomeKey(rawKey: String): Boolean = true

    override fun signup(req: SignupRequest, userAgent: String?, ipHash: String?): AuthResponseWithCookie {
        return AuthResponseWithCookie(
            user = AuthUserDto(id = "user-1", username = req.username),
            rawSessionToken = "session-token"
        )
    }

    override fun login(req: LoginRequest, userAgent: String?, ipHash: String?): AuthResponseWithCookie {
        return AuthResponseWithCookie(
            user = AuthUserDto(id = "user-1", username = req.username),
            rawSessionToken = "session-token"
        )
    }

    override fun logout(rawSessionToken: String) = Unit

    override fun getMe(rawSessionToken: String): AuthUserDto {
        val userId = sessionLookup(rawSessionToken) ?: error("unexpected getMe call")
        return AuthUserDto(id = userId, username = "user-$userId")
    }

    override fun getUserIdBySessionToken(rawSessionToken: String): String? = sessionLookup(rawSessionToken)
}

private class TestBackend(
    private val wsBehavior: suspend (DefaultWebSocketServerSession, Map<String, String>) -> Unit
) : AutoCloseable {
    private val lastRequestRef = AtomicReference<BackendEchoResponse?>()
    private val wsHeadersChannel = Channel<Map<String, String>>(capacity = 1)
    private val port = ServerSocket(0).use { it.localPort }
    private val engine = embeddedServer(Netty, port = port) {
        install(io.ktor.server.plugins.contentnegotiation.ContentNegotiation) {
            json(Json {
                ignoreUnknownKeys = true
            })
        }
        install(ServerWebSockets)
        routing {
            get("/health") {
                call.respond(HealthResponse(status = "ok"))
            }
            route("/v1/{...}") {
                handle {
                    val echoed = BackendEchoResponse(
                        method = call.request.httpMethod.value,
                        path = call.request.uri,
                        headers = call.request.headers.entries().associate { (key, values) -> key to values.joinToString(",") },
                        body = call.receiveChannel().readRemaining().readText()
                    )
                    lastRequestRef.set(echoed)
                    call.respond(echoed)
                }
            }
            webSocket("/v1/chats/{chatId}/ws") {
                val headers = call.request.headers.entries().associate { (key, values) -> key to values.joinToString(",") }
                wsHeadersChannel.trySend(headers)
                wsBehavior(this, headers)
            }
        }
    }.start(wait = false)

    val baseUrl: String = "http://127.0.0.1:$port"

    fun lastRequest(): BackendEchoResponse = checkNotNull(lastRequestRef.get()) { "No proxied request captured." }

    fun awaitWsHeaders(): Map<String, String> = runBlocking {
        wsHeadersChannel.receive()
    }

    override fun close() {
        engine.stop(gracePeriodMillis = 1000, timeoutMillis = 2000)
    }
}

@Serializable
private data class BackendEchoResponse(
    val method: String,
    val path: String,
    val headers: Map<String, String>,
    val body: String
)

private fun withBackendServer(
    wsBehavior: suspend (DefaultWebSocketServerSession, Map<String, String>) -> Unit = { session, _ ->
        session.close(CloseReason(CloseReason.Codes.NORMAL, "done"))
    },
    block: (TestBackend) -> Unit
) {
    TestBackend(wsBehavior).use(block)
}
