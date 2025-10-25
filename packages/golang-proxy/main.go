/*
	Copyright 2019 NetFoundry Inc.

	Licensed under the Apache License, Version 2.0 (the "License");
	you may not use this file except in compliance with the License.
	You may obtain a copy of the License at

	https://www.apache.org/licenses/LICENSE-2.0

	Unless required by applicable law or agreed to in writing, software
	distributed under the License is distributed on an "AS IS" BASIS,
	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
	See the License for the specific language governing permissions and
	limitations under the License.
*/

package main

import (
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/michaelquigley/pfxlog"
	"github.com/openziti/sdk-golang/ziti"
	"github.com/sirupsen/logrus"
)

type Greeter string

func (g Greeter) ServeHTTP(resp http.ResponseWriter, req *http.Request) {
	var result string
	if name := req.URL.Query().Get("name"); name != "" {
		result = fmt.Sprintf("Hello, %v, from %v\n", name, g)
		fmt.Printf("Saying hello to %v, coming in from %v\n", name, g)
	} else {
		result = "Who are you?\n"
		fmt.Println("Asking for introduction")
	}
	if _, err := resp.Write([]byte(result)); err != nil {
		panic(err)
	}
}

func serve(listener net.Listener, serverType string, router http.Handler) {
	if err := http.Serve(listener, router); err != nil {
		panic(err)
	}
}

func httpServerWithOAuth(listenAddr string, router http.Handler) {
	listener, err := net.Listen("tcp", listenAddr)
	if err != nil {
		panic(err)
	}
	fmt.Printf("listening for non-ziti requests on %v\n", listenAddr)
	if err := http.Serve(listener, router); err != nil {
		panic(err)
	}
}

func zitifiedServer(router http.Handler) {
	options := ziti.ListenOptions{
		ConnectTimeout: 5 * time.Minute,
		MaxConnections: 3,
	}

	// Get identity config
	cfg, err := ziti.NewConfigFromFile(os.Args[1])
	if err != nil {
		panic(err)
	}

	// Get service name (defaults to "simpleService")
	serviceName := "simpleService"
	if len(os.Args) > 2 {
		serviceName = os.Args[2]
		fmt.Printf("Using the provided service name [%v]", serviceName)
	} else {
		fmt.Printf("Using the default service [%v]", serviceName)
	}

	ctx, err := ziti.NewContext(cfg)

	if err != nil {
		panic(err)
	}

	listener, err := ctx.ListenWithOptions(serviceName, &options)
	if err != nil {
		fmt.Printf("Error binding service %+v\n", err)
		panic(err)
	}

	fmt.Printf("listening for requests for Ziti service %v\n", serviceName)
	serve(listener, "ziti", router)
}

func main() {
	// Load environment variables from .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	if os.Getenv("DEBUG") == "true" {
		pfxlog.GlobalInit(logrus.DebugLevel, pfxlog.DefaultOptions())
		pfxlog.Logger().Debugf("debug enabled")
	}

	// Initialize database
	dbPath := os.Getenv("DATABASE_PATH")
	if dbPath == "" {
		dbPath = "./users.db"
	}

	db, err := NewDatabase(dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Initialize auth configuration
	authConfig := NewAuthConfig()

	// Initialize middleware
	middleware := NewMiddleware(authConfig, db)

	// Setup routes
	router := middleware.SetupRoutes()

	// Startup zitified server and plain http server with OAuth
	// Temporarily disable Ziti server to test routes
	// go func() {
	// 	defer func() {
	// 		if r := recover(); r != nil {
	// 			log.Printf("Ziti server failed to start: %v", r)
	// 		}
	// 	}()
	// 	zitifiedServer(router)
	// }()
	httpServerWithOAuth("0.0.0.0:8080", router)
}
