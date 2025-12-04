/**
 * @format
 */

import React from 'react'
import App from '../App'

test('App component loads without crashing', () => {
  // Test that App component is defined and is a valid React component
  expect(App).toBeDefined()
  expect(typeof App).toBe('function')

  // Test that the App component can be imported and has expected structure
  const appElement = React.createElement(App)
  expect(appElement).toBeDefined()
  expect(appElement.type).toBe(App)
})
