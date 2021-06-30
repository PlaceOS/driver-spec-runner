ARG node_version=12
ARG crystal_version=1.0.0

FROM node:${node_version}-alpine as frontend-build
WORKDIR /frontend
COPY /frontend/package*.json  /frontend

RUN npm install -g @angular/cli @angular-builders/custom-webpack && npm clean-install

# Copy source after install dependencies
COPY frontend /frontend

# Build the frontend
RUN npx ng build --prod

###########################

FROM crystallang/crystal:${crystal_version}-alpine
WORKDIR /app

# Install the latest version of
# - libssh2
# - [GDB debugger](https://sourceware.org/gdb/current/onlinedocs/gdb/)
# - ping (via iputils)
# - libyaml
RUN apk add --update --no-cache \
  ca-certificates \
  gdb \
  iputils \
  libssh2 libssh2-dev libssh2-static \
  tzdata \
  yaml-static

# Add trusted CAs for communicating with external services
RUN update-ca-certificates

RUN mkdir -p /app/bin/drivers

COPY ./shard.yml /app/shard.yml
COPY ./shard.override.yml /app/shard.override.yml
COPY ./shard.lock /app/shard.lock

RUN shards install --production --ignore-crystal-version

COPY ./src /app/src
COPY --from=frontend-build /frontend/dist/driver-spec-runner /app/www

ENV PATH "$PATH:/app/bin"

# Build App
RUN shards build --error-trace --release --production --ignore-crystal-version

# Run the app binding on port 8080
EXPOSE 8080
ENTRYPOINT ["/app/bin/test-harness"]
CMD ["/app/bin/test-harness", "-b", "0.0.0.0", "-p", "8080"]
