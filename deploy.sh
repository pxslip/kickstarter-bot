#! /usr/bin/env sh
helm upgrade --install \
--set botToken=NTUyNTM1NzA1MjMxMDMyMzQy.D2A8oQ.kLXLusnY0y_4m0S8o_vEOZwp48Y\
,global.postgresql.postgresqlPassword=secret \
--create-namespace \
--namespace kickstarter-bot \
kickstarter-bot \
./helm-chart/