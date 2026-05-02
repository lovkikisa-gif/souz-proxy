package ru.souz.proxy.app

import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.calllogging.*
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
import ru.souz.proxy.auth.AuthService
import ru.souz.proxy.auth.authRoutes
import ru.souz.proxy.db.DatabaseFactory
import ru.souz.proxy.http.ErrorDto
import ru.souz.proxy.http.ErrorEnvelope
import ru.souz.proxy.http.healthRoutes
import ru.souz.proxy.http.staticRoutes
import ru.souz.proxy.proxy.reverseProxyRoutes
import java.time.Duration

fun main() {
    val config = ProxyConfig()

    DatabaseFactory.init(config.databaseUrl)
    val authService = AuthService(config)

    embeddedServer(Netty, host = config.host, port = config.port) {
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
            pingPeriod = Duration.ofSeconds(15)
            timeout = Duration.ofSeconds(15)
            maxFrameSize = 1024 * 1024 // 1 MB limit
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
            exception<Throwable> { call, cause ->
                call.application.environment.log.error("Unhandled exception", cause)
                call.respond(
                    HttpStatusCode.InternalServerError,
                    ErrorEnvelope(ErrorDto("internal_error", "An internal error occurred."))
                )
            }
        }

        routing {
            healthRoutes()
            authRoutes(authService, config)
            reverseProxyRoutes(authService, config)
            staticRoutes()
        }
    }.start(wait = true)
}
