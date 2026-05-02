package ru.souz.proxy.http

import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable

@Serializable
data class HealthResponse(val status: String)

@Serializable
data class ReadinessResponse(
    val status: String,
    val checks: Map<String, String>
)

data class ReadinessSnapshot(
    val ready: Boolean,
    val checks: Map<String, String>
)

fun Route.healthRoutes(readinessCheck: suspend () -> ReadinessSnapshot) {
    get("/health") {
        call.respond(HealthResponse(status = "ok"))
    }
    get("/healthz") {
        call.respond(HealthResponse(status = "ok"))
    }
    get("/ready") {
        val readiness = readinessCheck()
        call.respond(
            if (readiness.ready) HttpStatusCode.OK else HttpStatusCode.ServiceUnavailable,
            ReadinessResponse(
                status = if (readiness.ready) "ok" else "degraded",
                checks = readiness.checks
            )
        )
    }
    get("/readyz") {
        val readiness = readinessCheck()
        call.respond(
            if (readiness.ready) HttpStatusCode.OK else HttpStatusCode.ServiceUnavailable,
            ReadinessResponse(
                status = if (readiness.ready) "ok" else "degraded",
                checks = readiness.checks
            )
        )
    }
}
