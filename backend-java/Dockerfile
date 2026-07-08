FROM maven:3.9.11-eclipse-temurin-21 AS build

WORKDIR /workspace

COPY backend-java/pom.xml backend-java/pom.xml
RUN mvn -f backend-java/pom.xml dependency:go-offline

COPY backend-java backend-java
RUN mvn -f backend-java/pom.xml -DskipTests package

FROM eclipse-temurin:21-jre

WORKDIR /app

RUN mkdir -p /data/storage

COPY --from=build /workspace/backend-java/target/aigc-forensics-backend-0.1.0-SNAPSHOT.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
