from dotenv import load_dotenv
import os

load_dotenv() 
from pathlib import Path
BASE_DIR = Path(__file__).resolve().parent.parent
import environ                      
import os
env = environ.Env(
    # set default values and casting
    DEBUG=(bool, False)
)
environ.Env.read_env(os.path.join(BASE_DIR, '.env'))

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = env('SECRET_KEY')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env('DEBUG')

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["*"])

import cloudinary
import cloudinary.uploader
import cloudinary.api

# Application definition

INSTALLED_APPS = [
    'nested_admin',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'accounts',
    'admin_dashboard',
    'products',
    'cart',
    'orders',
    'promoter',
    'investor',
    'djoser',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'storages',
    'cloudinary',
    'cloudinary_storage',
    'django_extensions',
    
]


CLOUDINARY_URL = env("CLOUDINARY_URL")


if DEBUG:
    MEDIA_URL = "/media/"
    MEDIA_ROOT = BASE_DIR / "media"
else:
    DEFAULT_FILE_STORAGE = "cloudinary_storage.storage.MediaCloudinaryStorage"
    MEDIA_URL = "https://res.cloudinary.com/dnspivrbc/"  # let Cloudinary storage overwrite with the right URL





AUTH_USER_MODEL='accounts.CustomUser'

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware', 
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"


ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
       'DIRS': [BASE_DIR / "templates"],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases

import os
import dj_database_url

ENVIRONMENT = os.getenv('ENVIRONMENT', 'local')
DATABASE_URL = os.environ.get('DATABASE_URL')

print("ENVIRONMENT:", ENVIRONMENT)
print("DATABASE_URL:", DATABASE_URL)

if ENVIRONMENT == 'production':
    DATABASES = {
        'default': dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            ssl_require=True
        )
    }
    if DATABASES['default'] is None:
        raise ValueError(
            "DATABASE_URL is not set or invalid! Check Render environment variables."
        )
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.getenv('DB_NAME'),
            'USER': os.getenv('DB_USER'),
            'PASSWORD': os.getenv('DB_PASSWORD'),
            'HOST': os.getenv('DB_HOST'),
            'PORT': os.getenv('DB_PORT'),
        }
    }

# Optional: print parsed database settings for debugging in Render logs
print("Parsed DATABASES config:", DATABASES)

if ENVIRONMENT == 'production':
    FRONTEND_URL = os.getenv('FRONTEND_URL_PROD')
else:
    FRONTEND_URL = os.getenv('FRONTEND_URL_DEV')




# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/

STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / "static"]
# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'accounts.authentication.CookieJWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
        'django_filters.rest_framework.DjangoFilterBackend',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 5,  # Customize page size here
}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{levelname}] {asctime} {name}: {message}',
            'style': '{',
        },
        'simple': {
            'format': '[{levelname}] {name}: {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'loggers': {
        'accounts': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
        # Optional: also show other logs
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}



from datetime import timedelta
SIMPLE_JWT = {
    'AUTH_HEADER_TYPES': ('Bearer',),
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,  # ✅ Required for logout to work
    'UPDATE_LAST_LOGIN': False,


    'AUTH_COOKIE': 'access_token',  # Name for access token cookie
    'AUTH_COOKIE_REFRESH': 'refresh_token',  # Name for refresh token cookie
    'AUTH_COOKIE_SECURE': True,  # True in production (HTTPS)
    'AUTH_COOKIE_HTTP_ONLY': True,
    'AUTH_COOKIE_PATH': '/',
    'AUTH_COOKIE_SAMESITE': 'Lax',
}

if ENVIRONMENT == 'production':
    SIMPLE_JWT['AUTH_COOKIE_SECURE'] = True      # only send over HTTPS
    SIMPLE_JWT['AUTH_COOKIE_SAMESITE'] = 'None'  # allow cross-site requests
else:
    SIMPLE_JWT['AUTH_COOKIE_SECURE'] = False
    SIMPLE_JWT['AUTH_COOKIE_SAMESITE'] = 'Lax'

if ENVIRONMENT == 'production':
    CSRF_COOKIE_SECURE = True
    CSRF_COOKIE_SAMESITE = 'None'
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_SAMESITE = 'None'
else:
    CSRF_COOKIE_SECURE = False
    CSRF_COOKIE_SAMESITE = 'Lax'
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_SAMESITE = 'Lax'


DJOSER = {
    'LOGIN_FIELD': 'email',
    "EMAIL_FRONTEND_SITE_NAME": 'BESTON ELECTRICALS, ELECTRONICS, MOBILES',
    'ACTIVATION_URL': 'activate/{uid}/{token}',
    'SEND_CONFIRMATION_EMAIL': True,
    "EMAIL": {
        "activation": "accounts.email.CustomActivationEmail",
        "resend_activation": "accounts.email.CustomResendActivationEmail",
        'password_reset': 'accounts.email.CustomPasswordResetEmail',
    },
    'SEND_ACTIVATION_EMAIL': True,
    'USER_CREATE_PASSWORD_RETYPE': True,
    'PASSWORD_CHANGED_EMAIL_CONFIRMATION': True,
    'PASSWORD_RESET_CONFIRM_URL': '/password-reset/confirm/{uid}/{token}/',
    'SET_PASSWORD_RETYPE': True,
    'PASSWORD_RESET_SHOW_EMAIL_NOT_FOUND': True,
    'USER_LOGIN_PASSWORD_RESET': True,
    'USER_ID_FIELD': 'email',
    'PASSWORD_RESET_URL': '/password/reset/',
    'SERIALIZERS': {
        #  'user_create': 'accounts.serializers.CustomUserCreateSerializer',
        'user_create_password_retype': 'accounts.serializers.CustomUserCreatePasswordRetypeSerializer',  # For creation
        'user_login': 'accounts.serializers.UserLoginSerializer',
        'password_reset': 'accounts.serializers.CustomPasswordResetSerializer',
        'password_reset_confirm': 'accounts.serializers.CustomPasswordResetConfirmSerializer',
        'password_change': 'accounts.serializers.CustomPasswordChangeSerializer',
        'user': 'accounts.serializers.RoleBasedUserDisplaySerializer',       # role-based
        'current_user': 'accounts.serializers.RoleBasedUserDisplaySerializer', # role-based
        'user_delete': 'djoser.serializers.UserDeleteSerializer',
        'set_password': 'accounts.serializers.CustomSetPasswordSerializer',
    },
}

SITE_ID = 1


AUTHENTICATION_BACKENDS = [
    
    'django.contrib.auth.backends.ModelBackend',  # Default authentication
]

SOCIAL_AUTH_USER_MODEL = 'accounts.CustomUser'

SOCIAL_AUTH_PIPELINE = [
    'social_core.pipeline.social_auth.associate_user',
    'accounts.pipeline.capture_login_ip',
    'social_core.pipeline.social_auth.social_details',
    'social_core.pipeline.social_auth.social_uid',
    'social_core.pipeline.social_auth.auth_allowed',
    'social_core.pipeline.social_auth.social_user',
    'social_core.pipeline.user.get_username',
    'social_core.pipeline.user.create_user',
    'social_core.pipeline.social_auth.associate_user',
    'social_core.pipeline.social_auth.load_extra_data',
    'social_core.pipeline.user.user_details',
]



STATIC_ROOT = BASE_DIR / "staticfiles"


CORS_ALLOW_CREDENTIALS = True
CSRF_COOKIE_HTTPONLY = False
CORS_ALLOWED_ORIGINS = [
    "https://beston.netlify.app",
    "http://localhost:5173"
]

CSRF_COOKIE_NAME = 'csrftoken'
CSRF_HEADER_NAME = "X-CSRFToken"

if ENVIRONMENT == "production":
    # --- Brevo SMTP setup ---
    INSTALLED_APPS += ["anymail"]
    EMAIL_BACKEND = "anymail.backends.brevo.EmailBackend"
    ANYMAIL = {
        "BREVO_API_KEY": os.getenv("BREVO_API_KEY"),
    }
    DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL")

else:
    # --- Local / development (MailHog or Console) ---
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
    EMAIL_HOST = "localhost"
    EMAIL_PORT = 1025
    EMAIL_HOST_USER = ""
    EMAIL_HOST_PASSWORD = ""
    EMAIL_USE_TLS = False
    EMAIL_USE_SSL = False
    DEFAULT_FROM_EMAIL = "noreply@example.com"


SOCIAL_AUTH_GOOGLE_OAUTH2_KEY=env("SOCIAL_AUTH_GOOGLE_OAUTH2_KEY")
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET=env("SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET")
SOCIAL_AUTH_GOOGLE_OAUTH2_REDIRECT_URI = env("SOCIAL_AUTH_GOOGLE_OAUTH2_REDIRECT_URI")


LOGIN_REDIRECT_URL = '/' 
SOCIAL_AUTH_GOOGLE_OAUTH2_SCOPE = [ 'email', 'profile','openid',]
SOCIAL_AUTH_GOOGLE_OAUTH2_EXTRA_DATA = ['first_name', 'last_name']
SOCIAL_AUTH_LOGIN_ERROR_URL = '/login-error/'

SOCIAL_AUTH_FACEBOOK_KEY = env('SOCIAL_AUTH_FACEBOOK_KEY')
SOCIAL_AUTH_FACEBOOK_SECRET = env('SOCIAL_AUTH_FACEBOOK_SECRET')

SOCIAL_AUTH_FACEBOOK_SCOPE = [env('SOCIAL_AUTH_FACEBOOK_SCOPE')]  # turns 'email' into ['email']

SOCIAL_AUTH_FACEBOOK_PROFILE_EXTRA_PARAMS = {
    'fields': env('SOCIAL_AUTH_FACEBOOK_PROFILE_EXTRA_PARAMS_FIELDS')
}

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')



# Razorpay credentials (test mode)
RAZORPAY_KEY_ID = env('RAZORPAY_KEY_ID')
RAZORPAY_KEY_SECRET = env('RAZORPAY_KEY_SECRET')
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True


CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=[]
)





if ENVIRONMENT == 'production':
    DELHIVERY_API_TOKEN = env("DELHIVERY_LIVE_API_TOKEN")
else:
    DELHIVERY_API_TOKEN = env("DELHIVERY_TEST_API_TOKEN")

DELHIVERY_API_URL = os.environ.get("DELHIVERY_API_URL", "https://staging-express.delhivery.com/api/kinko/v1/invoice/charges/.json")
DELHIVERY_CLIENT_CODE=os.environ.get("DELHIVERY_CLIENT_CODE")
DELHIVERY_PICKUP = {
    "name": env("DELHIVERY_PICKUP_NAME", default="Beston Connect"),
    "city": env("DELHIVERY_PICKUP_CITY", default="Gudalur"),
    "state": env("DELHIVERY_PICKUP_STATE", default="Tamil Nadu"),
    "pin": env("DELHIVERY_PICKUP_PIN", default="643212"),
    "country": env("DELHIVERY_PICKUP_COUNTRY", default="India"),
    "phone": env("DELHIVERY_PICKUP_PHONE", default="7094291701"),
    "add": env(
        "DELHIVERY_PICKUP_ADDRESS",
        default="2/625, Parankolli, Sreemadurai (PO), Manvayal, Gudalur, The Nilgiris",
    ),
}