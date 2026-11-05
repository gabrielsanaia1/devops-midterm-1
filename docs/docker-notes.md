# Docker

## იმიჯის ზომების შედარება

| მაჩვენებელი | საწყისი იმიჯი | გაუმჯობესებული იმიჯი |
|---|---:|---:|
| Disk usage | 1.71 GB | 250 MB |
| Content size | 419 MB | 62.3 MB |

ორივე მაჩვენებელი დაახლოებით 85%-ით შემცირდა.

საწყისი იმიჯის აგება და ზომების შემოწმება:

```bash
docker build -t devops-midterm-1:before .
docker image ls devops-midterm-1
```

გაუმჯობესებული იმიჯი აგებულია Compose-ით და აქვს სახელი
`devops-midterm-1:after`.

## Dockerfile-ის გაუმჯობესებები

გამოყენებულია multi-stage build. პირველ ეტაპზე `npm ci --omit=dev`
აყენებს მხოლოდ production დამოკიდებულებებს. საბოლოო ეტაპი იყენებს
`node:22-alpine`-ს და შეიცავს აპლიკაციის კოდსა და საჭირო დამოკიდებულებებს.

`.dockerignore` build context-იდან გამორიცხავს node_modules-ს,
ტესტებს, coverage-ს, Git-ის ფაილებს, დოკუმენტაციასა და .env ფაილებს.

აპლიკაცია მუშაობს non-root მომხმარებლით. შემოწმება:

```bash
docker compose exec api id
```

შედეგი: `uid=1000(node) gid=1000(node) groups=1000(node)`.

პროცესი პირდაპირ `node src/server.js`-ით ეშვება, რათა Node-მა
კონტეინერის გაჩერების სიგნალი უშუალოდ მიიღოს, npm-ის შუამავლობის გარეშე.

HEALTHCHECK ამოწმებს `/health` endpoint-ს.

APP_VERSION build argument გადადის runtime გარემოს ცვლადში.
APP_VERSION=1.0.0-ით აგების შემდეგ:

```bash
curl http://localhost:3000/version
```

პასუხი: `{"version":"1.0.0"}`.

## Compose-ის პრობლემის დიაგნოსტიკა

საწყისი შემოწმება:

```bash
docker compose up -d --build
curl -i http://localhost:3000/health
docker compose logs --tail=20 api
```

პასუხი იყო HTTP 503 და `{"status":"unavailable"}`.
ლოგში ჩანდა `redis: connect ECONNREFUSED 127.0.0.1:6379`.

მიზეზი იყო REDIS_URL=redis://localhost:6379:
API კონტეინერში localhost თავად API კონტეინერს მიუთითებს,
ხოლო Redis ცალკე კონტეინერში მუშაობს.

მისამართი შეიცვალა `redis://redis:6379`-ით, სადაც redis
Compose-ის სერვისის სახელია.

გასწორების შემდეგ `/health` აბრუნებს HTTP 200-ს და `{"status":"ok"}`.

Redis-ს დაემატა `redis-cli ping` healthcheck.
API-ის depends_on იყენებს `condition: service_healthy`,
ამიტომ API-ის გაშვებამდე Compose Redis-ის მზადყოფნას ელოდება.

Redis-ის მონაცემებისთვის გამოყენებულია redis-data named volume,
რომელიც მიერთებულია `/data`-ზე. ჩართულია AOF persistence.

Compose პარამეტრებს იღებს `.env`-დან.
რეპოზიტორიაში შეტანილია `.env.example`, ხოლო `.env` იგნორირებულია.

## მონაცემების შენარჩუნების შემოწმება

შეიქმნა ამოცანა:

```bash
curl -i -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Persistence check","priority":"high"}'
```

შემდეგ კონტეინერები წაიშალა და თავიდან შეიქმნა:

```bash
docker compose down
docker compose up -d --wait
curl http://localhost:3000/tasks
```

ხელახლა გაშვების შემდეგ დაბრუნდა:

```json
[{"id":1,"title":"Persistence check","priority":"high","dueDate":null,"done":false,"completedAt":null,"createdAt":"2026-11-05T13:13:34.006Z"}]
```

ამოცანა იმავე ID-ით შენარჩუნდა. `docker compose down`
named volume-ს არ შლის, ამიტომ Redis ხელახლა გაშვებისას
შენახულ მონაცემებს კითხულობს. `down -v` არ გამოგვიყენებია.
