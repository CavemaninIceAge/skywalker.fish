ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN know_skywalker INTEGER NOT NULL DEFAULT 0;

INSERT INTO users (nickname, password_hash, name, know_skywalker)
VALUES ('SkywalkerFishItself', 'd32c5a8b740db5e2784af0851d412949a6f98a8f4a875d97d138d37c1c4958a9', '于天行', 1);
