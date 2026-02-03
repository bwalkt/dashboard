FROM node:18-alpine AS builder
WORKDIR /app
COPY tsconfig.json ./
COPY ts ./ts
RUN npm install typescript@5.9.3 @types/k6@1.5.0 --save-dev
RUN npx tsc

FROM grafana/k6:1.5.0
WORKDIR /tests
COPY --from=builder /app/dist ./dist
COPY --chmod=755 run-tests.sh /tests/run-tests.sh
ENTRYPOINT []
CMD ["sh", "/tests/run-tests.sh"]

