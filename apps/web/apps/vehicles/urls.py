from django.urls import path

from . import views

app_name = "vehicles"

urlpatterns = [
    path("", views.vehicle_list, name="list"),
    path("<uuid:pk>", views.vehicle_detail, name="detail"),
    path("<uuid:pk>/configurations", views.configuration_list, name="config-list"),
    path("<uuid:pk>/configurations/<uuid:config_pk>", views.configuration_detail, name="config-detail"),
    path("<uuid:pk>/setups", views.setup_list, name="setup-list"),
    path("<uuid:pk>/setups/<uuid:setup_pk>", views.setup_detail, name="setup-detail"),
]
