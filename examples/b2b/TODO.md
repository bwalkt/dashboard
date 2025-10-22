
examples/b2b/golang-ziti/auth.go
Comment on lines +245 to +260
func (ac *AuthConfig) ValidateJWT(tokenString string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		return []byte(ac.JWTSecret), nil
	})

	if err != nil {
		return nil, err
	}

	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return claims, nil
}
@coderabbitai coderabbitai bot 3 hours ago
⚠️ Potential issue | 🔴 Critical

Enforce HS512 at verify time to prevent algorithm confusion.

The verification callback doesn't validate the signing algorithm, making the code vulnerable to algorithm substitution attacks.

Apply this diff:

 func (ac *AuthConfig) ValidateJWT(tokenString string) (*Claims, error) {
 	claims := &Claims{}
 	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
+		if token.Method.Alg() != jwt.SigningMethodHS512.Alg() {
+			return nil, fmt.Errorf("unexpected signing method: %s", token.Method.Alg())
+		}
 		return []byte(ac.JWTSecret), nil
 	})


examples/b2b/golang-ziti/auth.go
Comment on lines +424 to +444
func (ac *AuthConfig) ClearJWTCookies(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     "accessToken",
		Value:    "",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		MaxAge:   -1,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "refreshToken",
		Value:    "",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		Path:     "/",
		MaxAge:   -1,
	})
}




⚠️ Potential issue | 🟠 Major

Use configurable Secure flag to match SetJWTCookies.

Lines 429 and 439 use hardcoded Secure: false, which creates a mismatch with SetJWTCookies. When clearing cookies, the Secure attribute should match the original cookie for reliable deletion across all contexts.

Apply this diff:

 func (ac *AuthConfig) ClearJWTCookies(w http.ResponseWriter) {
 	http.SetCookie(w, &http.Cookie{
 		Name:     "accessToken",
 		Value:    "",
 		HttpOnly: true,
-		Secure:   false,
+		Secure:   ac.SecureCookies,
 		SameSite: http.SameSiteLaxMode,
 		Path:     "/",
 		MaxAge:   -1,
 	})
 
 	http.SetCookie(w, &http.Cookie{
 		Name:     "refreshToken",
 		Value:    "",
 		HttpOnly: true,
-		Secure:   false,
+		Secure:   ac.SecureCookies,
 		SameSite: http.SameSiteLaxMode,
 		Path:     "/",
 		MaxAge:   -1,
 	})
 }
