# Copilot Instructions for XJP56 Modern Showcase App

Welcome to the XJP56 Modern Showcase App codebase! This document provides essential guidelines for AI coding agents to effectively contribute to this project.

## Project Overview

The XJP56 Modern Showcase App is a React-based web application built with Vite. It serves as a modern showcase platform for:

- **Members**: Displaying member profiles with detailed information and selection history.
- **Singles**: Showcasing singles with album covers, tracklists, and lineup management (including drag-and-drop functionality).
- **Blog**: Displaying news posts with an editor and image upload functionality.

### Key Features
- **Admin Mode**: Allows users to add, edit, and delete members, singles, and blog posts.
- **Audio Upload**: Supports uploading and playing audio files for A-side tracks.
- **LocalStorage Integration**: Data is stored in the browser's `localStorage` for demo purposes.

## Codebase Structure

- **`src/components/ui/`**: Reusable UI components (e.g., `button.jsx`, `dialog.jsx`).
- **`src/lib/`**: Utility functions (e.g., `utils.js` contains helper functions like `readFileAsDataURL` and `safeParse`).
- **`src/App.jsx`**: Main application logic, including routing and page components.
- **`src/assets/`**: Static assets like images.

## Developer Workflows

### Running the Application
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```

### Building for Production
To build the application for production:
```bash
npm run build
```

### Linting
The project uses ESLint for linting. Run the following command to check for linting issues:
```bash
npm run lint
```

## Project-Specific Conventions

1. **Data Storage**: All data (members, singles, posts) is stored in `localStorage` under the key `xjp56_app_v2_audio`. Use the `loadData` and `saveData` functions in `App.jsx` to interact with the data.
2. **Admin Mode**: Admin-specific functionality is toggled using the `admin` state. Ensure that admin-only features are properly gated.
3. **Component Design**: Components are designed with Tailwind CSS for styling. Follow the existing patterns for consistency.
4. **Drag-and-Drop**: The lineup editing feature for singles uses drag-and-drop functionality. Ensure any changes to this feature maintain its usability.

## External Dependencies

- **Vite**: Used as the build tool for fast development and optimized production builds.
- **Tailwind CSS**: For styling the application.
- **React**: Core framework for building the UI.
- **LocalStorage**: Used for persisting data in the browser.

## Key Patterns and Examples

- **Dropdown Menu**: The `DropdownMenu` component is used for user interactions in the `TopBar` and other areas. Example usage:
  ```jsx
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button>Open Menu</Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem onSelect={handleSelect}>Option</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
  ```

- **Audio Upload**: The `AudioUploader` component in `App.jsx` demonstrates how to handle audio file uploads and playback using `FileReader` and `localStorage`.

- **Data Migration**: The `migrateData` function in `App.jsx` ensures backward compatibility with older versions of the app's data structure.

## Notes for AI Agents

- Focus on maintaining the "modern showcase" aesthetic when adding or modifying UI components.
- Ensure all new features are compatible with the `localStorage`-based data model.
- Follow the existing patterns for component structure and utility functions.
- When adding new features, consider how they integrate with the admin mode and existing data flows.

For any questions or clarifications, refer to the `README.md` or reach out to the project maintainers.