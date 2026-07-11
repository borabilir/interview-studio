# Interview Prep API

ASP.NET Core Clean Architecture, EF Core ve SQLite tabanlı Interview Studio API.

```powershell
dotnet restore .\InterviewPrep.sln
dotnet run --project .\src\InterviewPrep.Api
```

API ilk açılışta migration'ları uygular ve boş veritabanını Türkçe mülakat hazırlık içeriğiyle seed eder. Veritabanı yolu:

```text
src/InterviewPrep.Api/App_Data/interview-prep.db
```

Swagger development ortamında `http://localhost:5187/swagger` adresindedir.

## Endpoint grupları

- `/api/dashboard`
- `/api/topics`
- `/api/notes`
  - `GET /api/notes?topicId={guid}` Topic'e göre filtreler.
- `/api/coding-questions`
  - `PATCH /api/coding-questions/{id}/draft` Monaco taslağını DB'ye kaydeder.
- `/api/flashcards`
  - `GET /api/flashcards?topicId={guid}` Topic'e göre filtreler.
- `/api/interview-sessions`
- `/api/system-design-scenarios`
  - `GET /api/system-design-scenarios?topicId={guid}` Topic'e göre filtreler.
- `/api/progress`
- `/api/study-plans`
- `/api/search?q=...`
- `/api/health`

Yeni migration:

```powershell
dotnet ef migrations add MigrationAdi `
  --project .\src\InterviewPrep.Infrastructure `
  --startup-project .\src\InterviewPrep.Api `
  --output-dir Persistence\Migrations
```
