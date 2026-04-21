FROM nginx:alpine
# Másoljuk a kódot
COPY . /usr/share/nginx/html
# Másoljuk az Nginx konfigot a megfelelő helyre
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80