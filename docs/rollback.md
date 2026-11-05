# CD და rollback

## გარემო

იმიჯები ინახება GHCR-ში. Staging და production სიმულირებულია
GitHub Actions-ის დროებით runner-ებზე; მუდმივი production სერვერი არ გვაქვს.

## შესრულებული ნაბიჯები

1. v1.0.0 tag-ზე workflow-მ ააწყო და GHCR-ში ატვირთა იმიჯი.
   Staging-ის smoke ტესტი წარმატებით დასრულდა.
2. workflow_dispatch-ით, version=v1.0.0 პარამეტრით,
   ხელით გავუშვით production-ის წარმატებული შემოწმება.
3. experiment/broken-health ბრენჩში /health განზრახ შევცვალეთ:
   endpoint აბრუნებდა HTTP 503-ს. გამოვაქვეყნეთ v1.1.0.
4. v1.1.0-ის staging smoke ტესტი ჩავარდა. ეს ვერსია production-ზე
   არ გაგვიშვია; ბოლო წარმატებული production ვერსია დარჩა v1.0.0.
5. Rollback-ის დემონსტრაციისთვის ხელით ხელახლა გავუშვით v1.0.0.
   გამოყენებული იყო GHCR-ში არსებული იმიჯი, ხელახალი აწყობის გარეშე.
   Production smoke ტესტი წარმატებით დასრულდა.
6. git revert --no-edit f22b326 ბრძანებით გავაუქმეთ განზრახ
   შეტანილი შეცდომა. Lint და ტესტები წარმატებით დასრულდა.
7. გამოვაქვეყნეთ v1.1.1. იმიჯის გამოქვეყნება და staging შემოწმება
   წარმატებით დასრულდა.

## მტკიცებულებები

- [v1.0.0 — publish და staging](https://github.com/gabrielsanaia1/devops-midterm-1/actions/runs/42041225510)
- [v1.1.0 — staging failure](https://github.com/gabrielsanaia1/devops-midterm-1/actions/runs/42056610135)
- [Rollback — v1.0.0 production](https://github.com/gabrielsanaia1/devops-midterm-1/actions/runs/42056968762)
- [v1.1.1 — publish და staging](https://github.com/gabrielsanaia1/devops-midterm-1/actions/runs/42062753322)

## Blue-green, canary და feature flag

Blue-green მიდგომაში ტრაფიკი ახალ გარემოზე ერთბაშად გადადის,
ხოლო rollback ძველ გარემოზე დაბრუნებით ხდება.
Canary მიდგომაში ახალი ვერსია თავდაპირველად მომხმარებელთა მცირე
ნაწილს მიეწოდება და წარმატებული მონიტორინგის შემდეგ ფართოვდება.
თუ პრობლემური ქცევა feature flag-ით იმართება, მისი გამორთვა შეიძლება
ხელახალი განთავსების გარეშე, თუმცა ეს ტესტირებას არ ანაცვლებს.
