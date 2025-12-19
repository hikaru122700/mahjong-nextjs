.PHONY: init dev build deploy

init:
	npm install

dev:
	npm run dev

build:
	npm run build

deploy: build
	npm run start
