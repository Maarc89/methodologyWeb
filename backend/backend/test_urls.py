from django.urls import path, include

# Minimal URL config for tests that imports api.urls
urlpatterns = [
    path('api/', include('api.urls')),
]

