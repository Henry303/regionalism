# Regionalism

A full-stack interactive app that allowers users to share local words and phrases from their regional English dialect, built with the DeepSpace SDK. Users can pin words/phrases to their location, allowing for the real-time synchronous sharing of local words. 

**Live Demo**: `regionalism.app.space`

## Features

- **Interactive Map:** Pan and zoom across a map with regionalism pins. Clicking a pin shows the word or phrase, its meaning, and the general region of the user who made the pin.
- **Simple Pin Creation:** The circular `+` button opens a quick form for just the word/phrase and its meaning. The pin automatically uses the general location and rounded coordinates saved to your profile.
- **Searchable Pin List:** Browse all submitted pins and filter by word or region. Selecting a pin in the list centers and highlights it on the map.
- **Profile & Account Controls:** Edit your general location, update or delete your own pins, log out, or delete your account (which also deletes all pins you've created).
- **Responsive Layout:** On mobile, navigation sits in a bottom bar (`Map`, `List`, `Profile`) with touch-friendly buttons. On desktop, it switches to a top bar (`Map`, `Profile`) with the pin list docked to the right of the map.

## Limitations 

- There is no handling for offensive or harmful language.
- Users can only place pins in their account's location.
- Only one pin is visible per general location. 

## Future Improvement

- Implement handling for offensive and harmful language in the app
- Expand customization of pin location while maintaining location security
- Track density of similar pins to calculate regional trends
- Attach optional audio clips to pins to clarify word pronunciation  

## Development
```
npm install 
npm run dev
```

## Deployment
```
npm run deploy
```