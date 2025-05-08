# Test Administration App

A web application for creating, managing and conducting online tests built with React and Supabase.

## Features

- Google Authentication for secure access
- Create tests by uploading questions via CSV
- Configure test duration and question counts
- Take tests with automatic timing and scoring
- View test results immediately after completion
- Responsive design for all devices

## Tech Stack

- React with TypeScript
- Supabase for backend and authentication
- React Router for navigation
- TailwindCSS for styling
- Papa Parse for CSV handling
- Lucide React for icons

## Getting Started

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your Supabase credentials:
```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm start
```

## CSV Format for Questions

Upload questions using a CSV file with the following columns:

- No. - Question number
- Category - Question category
- Sub-Category - Question sub-category
- Question - The question text
- Option 1 - First option
- Option 2 - Second option
- Option 3 - Third option
- Option 4 - Fourth option
- Answer - Correct answer (in format "Option X" where X is 1-4)

## Available Scripts

### `npm start`
Runs the app in development mode at [http://localhost:3000](http://localhost:3000)

### `npm test`
Launches the test runner in interactive watch mode

### `npm run build`
Builds the app for production to the `build` folder

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
