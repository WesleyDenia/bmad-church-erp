FROM mysql:8.4.8

COPY docker-entrypoint-wrapper.sh /usr/local/bin/church-erp-mysql-entrypoint
RUN chmod 0755 /usr/local/bin/church-erp-mysql-entrypoint

ENTRYPOINT ["church-erp-mysql-entrypoint"]
CMD ["mysqld"]
