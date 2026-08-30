# Integration Contract: catalog-microservice


## Purpose
Record reviewed ecosystem capability decisions for catalog-microservice.

## Capability Decisions
| Capability | Decision | Reason |
|---|---|---|
| auth | required | Existing repository documentation identifies auth as part of this repository boundary or required ecosystem operation. |
| postgres | required | Existing repository documentation identifies postgres as part of this repository boundary or required ecosystem operation. |
| redis | required | Existing repository documentation identifies redis as part of this repository boundary or required ecosystem operation. |
| logging | required | Existing repository documentation identifies logging as part of this repository boundary or required ecosystem operation. |
| notifications | not-applicable | No documented dependency on notifications exists in this repository current architecture. |
| ai | not-applicable | No documented dependency on ai exists in this repository current architecture. |
| payments | not-applicable | No documented dependency on payments exists in this repository current architecture. |
| catalog | required | Existing repository documentation identifies catalog as part of this repository boundary or required ecosystem operation. |
| orders | not-applicable | No documented dependency on orders exists in this repository current architecture. |
| warehouse | not-applicable | No documented dependency on warehouse exists in this repository current architecture. |
| invoices | not-applicable | No documented dependency on invoices exists in this repository current architecture. |
| object-storage | required | Existing repository documentation identifies object-storage as part of this repository boundary or required ecosystem operation. |
| event-bus | required | Existing repository documentation identifies event-bus as part of this repository boundary or required ecosystem operation. |
| docs-rag | required | Existing repository documentation identifies docs-rag as part of this repository boundary or required ecosystem operation. |
| monitoring | required | Existing repository documentation identifies monitoring as part of this repository boundary or required ecosystem operation. |
| backups | required | Existing repository documentation identifies backups as part of this repository boundary or required ecosystem operation. |

## Data Ownership
Ownership remains limited to the repository purpose stated in BUSINESS.md and SYSTEM.md.

## Authentication and Authorization
Use existing approved identity and credential boundaries; do not document secret values.

## Synchronous Dependencies
Required synchronous or operational dependencies are identified in the capability matrix.

## Asynchronous Dependencies
Only the reviewed event-bus decision defines an asynchronous dependency.

## Degraded Operation
A missing required capability degrades only its dependent documented behavior and must not cause secret disclosure or ownership bypass.

## Validation
Use IPS planning validation plus applicable repository architecture and health checks.
