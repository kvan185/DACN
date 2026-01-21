init:
	cd backend/ && npm i
	cd frontend/ && npm i

run-server:
	cd backend/ && npm start && cd ..

run-client:
	cd frontend/ && npm run dev && cd ..

pull-server:
	cd backend/ && git pull && cd ..