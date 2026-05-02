package ru.souz.proxy.http

import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable

@Serializable
data class HealthResponse(val status: String)

fun Route.healthRoutes() {
    get("/healthz") {
        call.respond(HealthResponse(status = "ok"))
    }
}
