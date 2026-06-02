package com.empresa.bingo.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${cors.allowed.origins:*}")
    private String corsAllowedOrigins;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(getAllowedOriginPatterns())
                .withSockJS();
    }

    private String[] getAllowedOriginPatterns() {
        List<String> origins = new ArrayList<>();

        origins.add("http://localhost:5173");
        origins.add("http://localhost:3000");
        origins.add("https://*.vercel.app");

        if (corsAllowedOrigins == null || corsAllowedOrigins.isBlank() || corsAllowedOrigins.equals("*")) {
            origins.add("*");
        } else {
            origins.addAll(
                    Arrays.stream(corsAllowedOrigins.split(","))
                            .map(String::trim)
                            .filter(value -> !value.isBlank())
                            .toList()
            );
        }

        return origins.toArray(new String[0]);
    }
}