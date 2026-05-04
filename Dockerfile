FROM eclipse-temurin:17-jdk-alpine AS build

WORKDIR /app

COPY pom.xml .
COPY src ./src

RUN ./mvnw clean package -DskipTests || mvn clean package -DskipTests


FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 10000

ENV JAVA_OPTS="-XX:+UseSerialGC -XX:TieredStopAtLevel=1 -Dfile.encoding=UTF-8"

CMD ["sh", "-c", "java $JAVA_OPTS -Dserver.port=${PORT:-10000} -Dserver.address=0.0.0.0 -jar app.jar"]