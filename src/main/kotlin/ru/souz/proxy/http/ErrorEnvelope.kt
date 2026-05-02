package ru.souz.proxy.http

import kotlinx.serialization.Serializable

@Serializable
data class ErrorDto(
    val code: String,
    val message: String
)

@Serializable
data class ErrorEnvelope(
    val error: ErrorDto
)
