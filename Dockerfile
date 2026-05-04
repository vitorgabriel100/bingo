FROM maven:3.9.9-eclipse-temurin-17-alpine AS build

WORKDIR /app

COPY pom.xml .

RUN mvn dependency:go-offline -DskipTests || true

COPY src ./src

RUN mvn clean package -DskipTests


FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 10000

ENV JAVA_OPTS="-XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Dfile.encoding=UTF-8"

CMD ["sh", "-c", "java $JAVA_OPTS -Dserver.port=${PORT:-10000} -Dserver.address=0.0.0.0 -jar app.jar"]