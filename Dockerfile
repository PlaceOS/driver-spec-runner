ARG NODE_VERSION=22

# always use x86 for this stage
FROM --platform=linux/amd64 node:${NODE_VERSION}-alpine AS frontend-build

WORKDIR /frontend
COPY /frontend/package*.json  /frontend

RUN npm set registry https://registry.npmjs.org/
RUN npm set progress false
RUN npm install --unsafe-perm=true -g @angular/cli @angular-builders/custom-webpack
RUN npm clean-install

# Copy source after install dependencies
COPY frontend /frontend

# Build the frontend
RUN npx ng build --configuration production

###########################

FROM placeos/crystal:latest AS build
WORKDIR /app

# Install the latest version of
# - [GDB debugger](https://sourceware.org/gdb/current/onlinedocs/gdb/)
# - ping (via iputils)
RUN apk add --update --no-cache gdb
RUN mkdir -p /app/bin/drivers

COPY ./shard.yml /app/shard.yml
COPY ./shard.override.yml /app/shard.override.yml
COPY ./shard.lock /app/shard.lock

RUN shards install --production --ignore-crystal-version

COPY ./src /app/src
COPY --from=frontend-build /frontend/dist/spec-runner-ui/browser /app/www

ENV PATH="$PATH:/app/bin"

# Build App
RUN shards build \
      --error-trace \
      --release \
      --production \
      --ignore-crystal-version \
    && \
    # Remove sources
    rm -r lib src

# we need to mark directories as safe on newer versions of git
RUN git config --global --add safe.directory "*"

# Run the app binding on port 8080
EXPOSE 8080
ENTRYPOINT ["/app/bin/test-harness"]
CMD ["/app/bin/test-harness", "-b", "0.0.0.0", "-p", "8080"]
