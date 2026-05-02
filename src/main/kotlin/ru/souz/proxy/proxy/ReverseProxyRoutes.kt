package ru.souz.proxy.proxy

import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.websocket.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import io.ktor.http.content.OutgoingContent
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.websocket.*
import io.ktor.util.*
import io.ktor.websocket.*
import io.ktor.utils.io.ByteReadChannel
import io.ktor.utils.io.ByteWriteChannel
import io.ktor.utils.io.copyTo
import kotlinx.coroutines.channels.ClosedReceiveChannelException
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.joinAll
import kotlinx.coroutines.launch
import ru.souz.proxy.app.ProxyConfig
import ru.souz.proxy.auth.AuthServicePort
import ru.souz.proxy.http.ErrorDto
import ru.souz.proxy.http.ErrorEnvelope
import kotlin.coroutines.cancellation.CancellationException

fun buildProxyHttpClient(config: ProxyConfig): HttpClient {
    return HttpClient(CIO) {
        expectSuccess = false
        engine {
            requestTimeout = config.backendRequestTimeout.toMillis()
        }
        install(io.ktor.client.plugins.websocket.WebSockets) {
            pingInterval = config.wsPingPeriod.toMillis()
            maxFrameSize = config.wsMaxFrameSizeBytes
        }
    }
}

fun Route.reverseProxyRoutes(
    authService: AuthServicePort,
    config: ProxyConfig,
    proxyHttpClient: HttpClient
) {
    
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

            val blockedRequestHeaders = setOf(
                "cookie", "host", "x-user-id", "x-souz-proxy-auth", "x-forwarded-user", 
                "x-forwarded-email", "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto",
                "forwarded", "authorization", "content-length", "transfer-encoding",
                "connection", "upgrade", "keep-alive", "proxy-authenticate",
                "proxy-authorization", "te", "trailer", "origin"
            )

            try {
                val response = proxyHttpClient.request("${config.backendUrl.trimEnd('/')}$proxiedUri") {
                    method = proxiedMethod
                    headers {
                        proxiedHeaders.forEach { key, values ->
                            // Strip dangerous headers
                            if (!blockedRequestHeaders.contains(key.lowercase())) {
                                values.forEach { value ->
                                    append(key, value)
                                }
                            }
                        }
                        // Add trusted identity headers
                        append("X-User-Id", userId)
                        append("X-Souz-Proxy-Auth", config.backendProxyToken)
                    }

                    if (shouldProxyRequestBody(call)) {
                        setBody(ProxyRequestBody(call))
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
                                !key.equals(HttpHeaders.TransferEncoding, ignoreCase = true) &&
                                !key.equals(HttpHeaders.Connection, ignoreCase = true) &&
                                !key.equals(HttpHeaders.Upgrade, ignoreCase = true)
                            ) {
                                values.forEach { append(key, it) }
                            }
                        }
                    }

                    override suspend fun writeTo(channel: ByteWriteChannel) {
                        response.bodyAsChannel().copyTo(channel)
                        channel.close(null)
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
        if (!config.isAllowedWebSocketOrigin(call.request.headers[HttpHeaders.Origin])) {
            close(CloseReason(CloseReason.Codes.VIOLATED_POLICY, "Origin not allowed."))
            return@webSocket
        }

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

        val backendWsBase = config.backendUrl
            .replaceFirst("https://", "wss://")
            .replaceFirst("http://", "ws://")

        val backendWsUrl = "$backendWsBase${call.request.uri}"
        val browserSession = this
        val logger = application.environment.log

        try {
            proxyHttpClient.webSocket(backendWsUrl, request = {
                headers {
                    append("X-User-Id", userId)
                    append("X-Souz-Proxy-Auth", config.backendProxyToken)
                }
            }) {
                proxyWebSocketTraffic(browserSession, this, logger)
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            call.application.environment.log.error("WS proxy error", e)
            close(CloseReason(CloseReason.Codes.INTERNAL_ERROR, "Backend unavailable."))
        }
    }
}

private fun shouldProxyRequestBody(call: ApplicationCall): Boolean {
    val contentLength = call.request.headers[HttpHeaders.ContentLength]?.toLongOrNull()
    return contentLength != null ||
        call.request.headers[HttpHeaders.TransferEncoding] != null ||
        call.request.httpMethod !in setOf(HttpMethod.Get, HttpMethod.Head, HttpMethod.Options)
}

private class ProxyRequestBody(
    private val call: ApplicationCall
) : OutgoingContent.WriteChannelContent() {
    override val contentLength: Long? = call.request.headers[HttpHeaders.ContentLength]?.toLongOrNull()

    override suspend fun writeTo(channel: ByteWriteChannel) {
        call.receiveChannel().copyTo(channel)
        channel.close(null)
    }
}

private suspend fun proxyWebSocketTraffic(
    browserSession: DefaultWebSocketServerSession,
    backendSession: DefaultClientWebSocketSession,
    logger: org.slf4j.Logger
) = coroutineScope {
    val closeSignal = CompletableDeferred<CloseReason>()

    val browserToBackend = launch {
        relayWebSocketFrames(
            source = browserSession,
            target = backendSession,
            logger = logger,
            direction = "browser->backend",
            closeSignal = closeSignal
        )
    }

    val backendToBrowser = launch {
        relayWebSocketFrames(
            source = backendSession,
            target = browserSession,
            logger = logger,
            direction = "backend->browser",
            closeSignal = closeSignal
        )
    }

    val closeReason = closeSignal.await()
    closeQuietly(backendSession, closeReason)
    closeQuietly(browserSession, closeReason)
    joinAll(browserToBackend, backendToBrowser)
}

private suspend fun relayWebSocketFrames(
    source: WebSocketSession,
    target: WebSocketSession,
    logger: org.slf4j.Logger,
    direction: String,
    closeSignal: CompletableDeferred<CloseReason>
) {
    try {
        for (frame in source.incoming) {
            when (frame) {
                is Frame.Close -> {
                    closeSignal.complete(frame.readReason() ?: CloseReason(CloseReason.Codes.NORMAL, "Closed"))
                    return
                }

                else -> target.send(frame)
            }
        }
        closeSignal.complete(awaitCloseReason(source))
    } catch (e: ClosedReceiveChannelException) {
        closeSignal.complete(awaitCloseReason(source))
    } catch (e: CancellationException) {
        closeSignal.complete(awaitCloseReason(source))
    } catch (e: Exception) {
        logger.error("WS $direction error", e)
        closeSignal.complete(CloseReason(CloseReason.Codes.INTERNAL_ERROR, "Proxy error."))
    }
}

private suspend fun closeQuietly(session: WebSocketSession, reason: CloseReason) {
    runCatching {
        session.close(reason)
    }
}

private suspend fun awaitCloseReason(session: WebSocketSession): CloseReason {
    return when (session) {
        is DefaultWebSocketServerSession -> session.closeReason.await()
        is DefaultClientWebSocketSession -> session.closeReason.await()
        else -> null
    } ?: CloseReason(CloseReason.Codes.NORMAL, "Closed")
}
