FROM grafana/k6:latest AS k6base

FROM node:18-alpine AS builder
WORKDIR /app
COPY tsconfig.json ./
COPY ts ./ts
RUN npm install typescript @types/k6 --save-dev
RUN npx tsc

FROM grafana/k6:latest
WORKDIR /tests
COPY --from=builder /app/dist ./dist
COPY run-tests.sh /tests/run-tests.sh
ENTRYPOINT []
CMD ["sh", "/tests/run-tests.sh"]

