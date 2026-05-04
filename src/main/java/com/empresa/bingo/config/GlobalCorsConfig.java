package com.empresa.bingo.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.util.Set;

@Configuration
public class GlobalCorsConfig {

    private static final Set<String> ALLOWED_ORIGINS = Set.of(
            "http://localhost:5173",
            "http://localhost:3000",
            "https://bingo-mocha-rho.vercel.app"
    );

    @Bean
    public FilterRegistrationBean<Filter> corsFilterRegistration() {
        FilterRegistrationBean<Filter> registration = new FilterRegistrationBean<>();

        registration.setFilter(new Filter() {
            @Override
            public void doFilter(
                    ServletRequest servletRequest,
                    ServletResponse servletResponse,
                    FilterChain chain
            ) throws IOException, ServletException {

                HttpServletRequest request = (HttpServletRequest) servletRequest;
                HttpServletResponse response = (HttpServletResponse) servletResponse;

                String origin = request.getHeader("Origin");

                if (origin != null && isAllowedOrigin(origin)) {
                    response.setHeader("Access-Control-Allow-Origin", origin);
                    response.setHeader("Vary", "Origin");
                }

                response.setHeader("Access-Control-Allow-Credentials", "true");
                response.setHeader(
                        "Access-Control-Allow-Methods",
                        "GET, POST, PUT, PATCH, DELETE, OPTIONS"
                );
                response.setHeader(
                        "Access-Control-Allow-Headers",
                        "Authorization, Content-Type, Accept, Origin, X-Requested-With"
                );
                response.setHeader(
                        "Access-Control-Expose-Headers",
                        "Authorization"
                );
                response.setHeader("Access-Control-Max-Age", "3600");

                if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
                    response.setStatus(HttpServletResponse.SC_OK);
                    return;
                }

                chain.doFilter(request, response);
            }
        });

        registration.addUrlPatterns("/*");
        registration.setOrder(Integer.MIN_VALUE);
        registration.setName("globalCorsFilter");

        return registration;
    }

    private static boolean isAllowedOrigin(String origin) {
        return ALLOWED_ORIGINS.contains(origin)
                || origin.endsWith(".vercel.app");
    }
}