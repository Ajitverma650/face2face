# TODO: Implement 5-Second Timer on Dashboard After Login

- [ ] Add states for `showTimer` (boolean) and `countdown` (number starting at 5) in Dashboard.jsx
- [ ] Add useEffect to start countdown timer on component mount, decrementing every second, and hide timer after 5 seconds
- [ ] Add UI element (banner) displaying "You can call after X seconds" with countdown
- [ ] Update `disabled` prop on UserList to include `showTimer`, preventing calls during timer
