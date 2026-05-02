package ru.souz.proxy.proxy

import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.websocket.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.http.content.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.util.*
import io.ktor.websocket.*
import kotlinx.coroutines.channels.ClosedReceiveChannelException
import kotlinx.coroutines.launch
import ru.souz.proxy.app.ProxyConfig
import ru.souz.proxy.auth.AuthService
import ru.souz.proxy.http.ErrorDto
import ru.souz.proxy.http.ErrorEnvelope

val proxyHttpClient = HttpClient(CIO) {
    install(io.ktor.client.plugins.websocket.WebSockets)
}

fun Route.reverseProxyRoutes(authService: AuthService, config: ProxyConfig) {
    
    // Reverse Proxy for HTTP /v1/{...}
    route("/v1/{...}") {
        handle {
            val token = call.request.cookies[config.cookieName]
            if (token == null) {
                call.respond(HttpStatusCode.Unauthorized, ErrorEnvelope(ErrorDto("unauthorized", "Authentication required.")))
                return@handle
            }

            val userId = try {
                authService.getUserIdBySessionToken(token)
            } catch (e: Exception) {
                null
            }

            if (userId == null) {
                call.respond(HttpStatusCode.Unauthorized, ErrorEnvelope(ErrorDto("unauthorized", "Authentication required.")))
                return@handle
            }

            val proxiedHeaders = call.request.headers
            val proxiedMethod = call.request.httpMethod
            val proxiedUri = call.request.uri

            try {
                val response = proxyHttpClient.request("${config.backendUrl}$proxiedUri") {
                    method = proxiedMethod
                    headers {
                        proxiedHeaders.forEach { key, values ->
                            // Strip dangerous headers
                            if (!key.equals(HttpHeaders.Cookie, ignoreCase = true) &&
                                !key.equals(HttpHeaders.Host, ignoreCase = true) &&
                                !key.equals("X-User-Id", ignoreCase = true) &&
                                !key.equals("X-Souz-Proxy-Auth", ignoreCase = true) &&
                                !key.equals(HttpHeaders.ContentLength, ignoreCase = true) &&
                                !key.equals(HttpHeaders.TransferEncoding, ignoreCase = true)
                            ) {
                                values.forEach { value ->
                                    append(key, value)
                                }
                            }
                        }
                        // Add trusted identity headers
                        append("X-User-Id", userId)
                        append("X-Souz-Proxy-Auth", config.backendProxyToken)
                    }

                    // Forward body if present
                    val channel = call.receiveChannel()
                    val contentLength = call.request.headers[HttpHeaders.ContentLength]?.toLongOrNull()
                    if (contentLength != null && contentLength > 0) {
                        setBody(channel)
                    }
                }

                // Proxy response back
                call.respond(object : OutgoingContent.WriteChannelContent() {
                    override val contentLength: Long? = response.contentLength()
                    override val contentType: ContentType? = response.contentType()
                    override val status: HttpStatusCode = response.status
                    override val headers: Headers = Headers.build {
                        response.headers.forEach { key, values ->
                            if (!key.equals(HttpHeaders.ContentLength, ignoreCase = true) &&
                                !key.equals(HttpHeaders.ContentType, ignoreCase = true) &&
                                !key.equals(HttpHeaders.TransferEncoding, ignoreCase = true)
                            ) {
                                values.forEach { append(key, it) }
                            }
                        }
                    }

                    override suspend fun writeTo(channel: io.ktor.utils.io.ByteWriteChannel) {
                        response.bodyAsChannel().copyAndClose(channel)
                    }
                })
            } catch (e: Exception) {
                call.application.environment.log.error("Proxy error", e)
                call.respond(HttpStatusCode.BadGateway, ErrorEnvelope(ErrorDto("bad_gateway", "Backend is unavailable.")))
            }
        }
    }

    // Reverse Proxy for WebSocket /v1/chats/{chatId}/ws
    webSocket("/v1/chats/{chatId}/ws") {
        val token = call.request.cookies[config.cookieName]
        if (token == null) {
            close(CloseReason(CloseReason.Codes.VIOLATED_POLICY, "Authentication required."))
            return@webSocket
        }

        val userId = try {
            authService.getUserIdBySessionToken(token)
        } catch (e: Exception) {
            null
        }

        if (userId == null) {
            close(CloseReason(CloseReason.Codes.VIOLATED_POLICY, "Authentication required."))
            return@webSocket
        }

        val backendWsUrl = "${config.backendUrl.replace("http", "ws")}${call.request.uri}"

        try {
            proxyHttpClient.webSocket(backendWsUrl, request = {
                headers {
                    append("X-User-Id", userId)
                    append("X-Souz-Proxy-Auth", config.backendProxyToken)
                }
            }) {
                val backendSession = this
                val browserSession = this@webSocket

                // From Browser to Backend
                val job1 = launch {
                    try {
                        for (frame in browserSession.incoming) {
                            backendSession.send(frame)
                        }
                    } catch (e: ClosedReceiveChannelException) {
                        // ignore
                    } catch (e: Exception) {
                        call.application.environment.log.error("WS browser->backend error", e)
                    } finally {
                        backendSession.close()
                    }
                }

                // From Backend to Browser
                val job2 = launch {
                    try {
                        for (frame in backendSession.incoming) {
                            browserSession.send(frame)
                        }
                    } catch (e: ClosedReceiveChannelException) {
                        // ignore
                    } catch (e: Exception) {
                        call.application.environment.log.error("WS backend->browser error", e)
                    } finally {
                        browserSession.close()
                    }
                }

                job1.join()
                job2.join()
            }
        } catch (e: Exception) {
            call.application.environment.log.error("WS proxy error", e)
            close(CloseReason(CloseReason.Codes.INTERNAL_ERROR, "Backend unavailable."))
        }
    }
}
