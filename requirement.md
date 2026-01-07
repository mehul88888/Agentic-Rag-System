# Technical Assessment – Agentic RAG System (Node.js POC)

## 1. Objective

Build a **terminal-based proof-of-concept (POC)** demonstrating an **agentic system** that can intelligently delegate user requests across multiple tools and data sources.

The goal of this assessment is to evaluate:

* Agent orchestration and decision-making
* Retrieval-Augmented Generation (RAG)
* Multi-tool coordination
* Code quality and architectural clarity
* Ability to explain design tradeoffs and decisions

This is **not** a production system.

---

## 2. Scope & Constraints

### In Scope

* Node.js-based CLI application
* LangGraph-based agent hierarchy
* Weaviate vector database (Dockerized)
* Mock Chart.js tool
* Structured, explainable agent responses

### Out of Scope

* Frontend UI

* HTTP / API server
* Authentication or authorization
* Real chart rendering
* Production embeddings or optimization

---

## 3. Technology Stack (Mandatory)

| Category        | Requirement                              |
| --------------- | ---------------------------------------- |
| Runtime         | Node.js (v18+)                           |
| Vector Database | Weaviate (Docker)                        |
| Agent Framework | LangGraph (JavaScript)                   |
| LLM Abstraction | LangChain                                |
| LLM Provider    | Google Gemini Free Tier **or** Local LLM |
| Vector Client   | Weaviate JavaScript Client               |
| Interface       | Terminal (CLI)                           |
| IDE             | Agentic IDE (Cursor or Windsurf)         |

---

## 4. System Overview

The system consists of a **root delegating agent** that interprets user intent and dynamically orchestrates one or more specialized tools.

```
User (CLI)
   ↓
Delegating Agent (LangGraph)
   ├── Direct LLM Response
   ├── Chart.js Tool (Mock)
   └── RAG Agent
         └── Weaviate (Multi-Tenant)
```

---

## 5. Weaviate Vector Database Setup

### 5.1 Deployment

* Weaviate must run inside Docker
* Multi-tenancy must be enabled

### 5.2 Schema Definition

**Class Name:** `KnowledgeBase`

| Field    | Type   | Configuration                  |
| -------- | ------ | ------------------------------ |
| fileId   | string | Not vectorized, not searchable |
| question | text   | Vectorized                     |
| answer   | text   | Vectorized                     |

### 5.3 Multi-Tenancy

* Enable `multiTenancyConfig`
* Use at least one tenant (e.g., `tenant1`) for all operations

---

## 6. Data Ingestion Requirements

* Insert **minimum three fictional Q&A records**
* Use the **Weaviate JavaScript client**
* Do **not** manually create vectors
* Embeddings may be auto-generated or bypassed

Example data domains:

* HR policies
* Employee guidelines
* Internal procedures

---

## 7. Agent Architecture Requirements

### 7.1 Delegating Agent (Root Agent)

#### Responsibilities

* Accept user input from terminal
* Analyze user intent
* Decide execution path:

  * Direct LLM response
  * Chart.js tool invocation
  * RAG agent invocation
  * Combined RAG + Chart execution
* Manage sequential or parallel tool calls
* Aggregate results into a single response

#### Decision Criteria (Illustrative)

| User Request                    | Expected Behavior |
| ------------------------------- | ----------------- |
| “What is the leave policy?”     | RAG               |
| “Show attendance chart”         | Chart             |
| “Explain policy and show chart” | RAG + Chart       |
| “What is 5 × 7?”                | Direct response   |

---

### 7.2 RAG Agent

#### Responsibilities

* Query Weaviate for relevant entries
* Retrieve:

  * Answer content
  * Associated `fileId` references
* Return structured output to delegating agent

#### Fallback Handling

If embeddings are unavailable:

* Use Weaviate `fetchObjects()` API
* Apply lightweight filtering or ranking logic

---

### 7.3 Chart.js Tool (Mock)

#### Responsibilities

* Accept structured input
* Return a **static mock Chart.js configuration**
* No data visualization or rendering required

Example output:

```json
{
  "type": "bar",
  "data": {
    "labels": ["Q1", "Q2", "Q3"],
    "datasets": [
      { "label": "Employees", "data": [20, 35, 30] }
    ]
  }
}
```

---

## 8. Multi-Tool Orchestration Requirements

* Delegating agent must support:

  * Single tool invocation
  * Multiple tool invocation
  * Sequential and parallel execution
* If a request requires multiple tools:

  * All tools must be executed
  * Outputs must be merged into one response

---

## 9. Response Contract (Strict)

Every delegating agent response **must conform** to the following structure:

```json
{
  "answer": "string",
  "references": {
    "rag": boolean,
    "chart": boolean
  },
  "fileIds": ["string"],
  "chartConfig": { }
}
```

### Field Rules

* `references` is **mandatory**
* `fileIds` present **only if RAG is used**
* `chartConfig` present **only if chart tool is used**

---

## 10. CLI Behavior

* Application runs via terminal command
* Accepts free-text user input
* Outputs structured response (JSON or formatted text)
* No web server or UI components

---

## 11. Video Assessment Requirements

### Content Expectations

The video must clearly explain:

* Overall system architecture
* Agent delegation logic
* Tool orchestration strategy
* Weaviate schema and multi-tenancy
* Challenges encountered
* Alternative approaches considered
* How AI IDE tooling was used

### Recording Rules

* Continuous recording
* Clear audio
* Duration under 60 minutes
* Upload via Google Drive

---

## 12. Evaluation Criteria

Candidates will be assessed on:

* Correctness of implementation
* Agent reasoning and orchestration quality
* Code structure and readability
* Tool integration
* Error handling and fallbacks
* Clarity of explanation in video

---

## 13. Deliverables

* Source code (Node.js)
* Docker configuration for Weaviate
* README with setup and run instructions
* Video walkthrough (Google Drive link)

---

## 14. Success Definition

The assessment is considered successful if:

* The CLI accepts diverse user requests
* The delegating agent selects correct execution paths
* RAG queries return accurate answers with references
* Chart.js configurations are generated when requested
* All responses conform to the defined response contract
