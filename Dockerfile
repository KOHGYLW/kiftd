FROM openjdk:8-jdk-alpine

WORKDIR /data
COPY . .

VOLUME conf
VOLUME filesystem

EXPOSE 8080

ENTRYPOINT ["java","-jar","kiftd-1.2.2-RELEASE.jar","-start"]
