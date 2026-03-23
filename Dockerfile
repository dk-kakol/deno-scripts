FROM denoland/deno:latest

WORKDIR /app

# Cache dependencies before copying source so layer is reused when only source changes
COPY deno.json deno.lock* ./
RUN deno install --frozen=false

# Copy the rest of the source
COPY shared/ ./shared/
COPY scripts/ ./scripts/

# Cache all remote imports
RUN deno cache scripts/openai-chat/main.ts

# Default command — override at runtime, e.g.:
#   docker compose run deno deno task chat "What is Deno?"
CMD ["deno", "task", "chat"]
