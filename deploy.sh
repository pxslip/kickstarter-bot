#! /usr/bin/env sh
helm upgrade --install \
--set botToken=$BOT_TOKEN\
,global.postgresql.postgresqlPassword=secret \
--create-namespace \
--namespace kickstarter-bot \
kickstarter-bot \
./helm-chart/