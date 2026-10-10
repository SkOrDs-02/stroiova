// Годинник сесії (009 FR-12): стінний час на старті + приріст монотонного. Переведення стінного годинника
// посеред сесії нічого не змінює; на поверненні з фону годинник перезапускається від стінного часу.
export function createSessionClock(wallNow: () => number, monoNow: () => number) {
  let wall0 = wallNow();
  let mono0 = monoNow();
  return {
    now: () => wall0 + (monoNow() - mono0),
    reset() {
      wall0 = wallNow();
      mono0 = monoNow();
    },
  };
}
