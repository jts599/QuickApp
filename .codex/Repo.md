# Repository Overview

## Purpose

This repository contains a **web framework implementation** designed to abstract away the complexities of web application development. The framework provides streamlined solutions for:

- **Authentication (Auth)**: User authentication and authorization management
- **RPC (Remote Procedure Calls)**: Client-server communication abstraction
- **View Management**: Component and routing management for the UI layer

The goal is to enable developers to build web applications with minimal additional knowledge and overhead, focusing on business logic rather than infrastructure concerns.

## Folder Structure

### `/src`

The core web framework implementation. This directory contains all the framework code including:

- Authentication system components
- RPC abstraction layer and communication protocols
- View management system
- Utilities and helper functions
- Type definitions and interfaces

All code in this directory should be framework-level, reusable, and independent of specific application logic.

### `/sampleImplementation`

A complete sample application built using the web framework. This serves as:

- **Test Suite**: Validates that the framework works correctly
- **Reference Implementation**: Demonstrates how to use the framework
- **Integration Testing**: Ensures all framework components work together
- **Documentation by Example**: Shows best practices for framework usage

This is an actual working application that exercises the framework's capabilities.

### `/.codex`

Development workflow and documentation directory:

#### `/.codex/instructions/`

Contains coding standards and guidelines:

- **CodeStyle.md**: Enterprise-grade documentation standards, clean code principles, function size requirements, and cyclomatic complexity guidelines. **All generated code must adhere to these standards.**

#### `/.codex/plans/`

**Implementation planning directory**. When working on complex features or changes:

1. **Create detailed implementation plans** as markdown files in this directory
2. Plans should include:
   - Problem statement and requirements
   - Proposed solution architecture
   - Step-by-step implementation tasks
   - Testing strategy
   - Potential risks and considerations
3. Use plans to organize work before diving into implementation
4. Reference plans during development to stay on track

## Development Guidelines

### When Working in This Repository

1. **Read CodeStyle.md First**: Understand the documentation and clean code requirements before writing code
2. **Framework Code (src)**: Write generic, reusable code that solves common web app challenges
3. **Sample Implementation**: Update or extend when adding new framework features to validate functionality
4. **Create Plans**: For non-trivial features, create an implementation plan in `.codex/plans/` before coding
5. **Maintain Abstraction**: Keep framework concerns separate from application-specific logic

### Code Organization Principles

- **Framework code** should be agnostic to specific applications
- **Sample implementation** should be a realistic use case, not a toy example
- **Documentation** is mandatory at the function level
- **Small, focused functions** with low cyclomatic complexity
- **Single responsibility** for every module and function

## Architecture Philosophy

The framework follows these core principles:

- **Separation of Concerns**: Auth, RPC, and View management are distinct, loosely coupled systems
- **Convention over Configuration**: Sensible defaults with optional customization
- **Developer Experience**: Minimize boilerplate and cognitive load
- **Type Safety**: Leverage TypeScript for robust, self-documenting APIs
- **Testing**: All framework features must be validatable through the sample implementation

## Working with the Codex Assistant

When the Codex assistant works in this repository, it should:

1. **Refer to this document** to understand the repository structure and purpose
2. **Follow CodeStyle.md** for all code generation
3. **Generate implementation plans** in `.codex/plans/` for complex features
4. **Maintain framework integrity** by keeping src/ generic and reusable
5. **Update sample implementation** when framework changes require validation
6. **Think about developer experience** - how can features be made more intuitive and simple?

---

*This repository is a framework for building web applications, not a web application itself. Always consider the end developer who will use this framework.*