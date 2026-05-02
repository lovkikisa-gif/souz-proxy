package ru.souz.proxy.security

import java.time.Clock
import java.time.Duration
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap

class RateLimitExceededException(message: String) : RuntimeException(message)

interface AttemptRateLimiter {
    fun checkOrThrow(bucketKey: String)
}

class InMemoryAttemptRateLimiter(
    private val maxAttempts: Int = 10,
    private val window: Duration = Duration.ofMinutes(5),
    private val clock: Clock = Clock.systemUTC()
) : AttemptRateLimiter {
    private val buckets = ConcurrentHashMap<String, AttemptBucket>()

    init {
        require(maxAttempts > 0) { "maxAttempts must be positive." }
        require(!window.isZero && !window.isNegative) { "window must be positive." }
    }

    override fun checkOrThrow(bucketKey: String) {
        val now = clock.instant()
        val cutoff = now.minus(window)
        val bucket = buckets.computeIfAbsent(bucketKey) { AttemptBucket() }

        synchronized(bucket) {
            while (bucket.attempts.isNotEmpty() && bucket.attempts.first() <= cutoff) {
                bucket.attempts.removeFirst()
            }
            if (bucket.attempts.size >= maxAttempts) {
                throw RateLimitExceededException("Too many attempts. Try again later.")
            }
            bucket.attempts.addLast(now)
        }
    }

    private class AttemptBucket {
        val attempts = ArrayDeque<Instant>()
    }
}
