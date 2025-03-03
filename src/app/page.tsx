import Link from "next/link";
import { SignInButton, SignUpButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="h-16 border-b flex items-center justify-between px-6">
        <h1 className="text-xl font-semibold">Momentum</h1>
        <div className="flex gap-4">
          <SignInButton mode="modal">
            <button className="px-4 py-2 rounded-md hover:bg-muted transition-colors">
              Sign In
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              Sign Up
            </button>
          </SignUpButton>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-4xl font-bold mb-4">
          AI-Powered Task & Notes Manager for Executives
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mb-8">
          Streamline your workflow with an intelligent assistant that helps you manage tasks, 
          organize notes, and provides data-driven insights.
        </p>
        
        <div className="flex gap-4">
          <SignUpButton mode="modal">
            <button className="px-6 py-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-lg">
              Get Started
            </button>
          </SignUpButton>
          <Link 
            href="#features" 
            className="px-6 py-3 rounded-md border hover:bg-muted transition-colors text-lg"
            aria-label="Learn more about features"
            tabIndex={0}
          >
            Learn More
          </Link>
        </div>
      </main>
      
      <section id="features" className="py-16 px-6 bg-muted/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-card p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Task Management</h3>
              <p className="text-muted-foreground">
                Create, organize, and prioritize tasks with AI-powered enhancements.
              </p>
            </div>
            
            <div className="bg-card p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Smart Notes</h3>
              <p className="text-muted-foreground">
                Capture and organize notes with automatic summarization and cleanup.
              </p>
            </div>
            
            <div className="bg-card p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3">AI Assistant</h3>
              <p className="text-muted-foreground">
                Interact with an intelligent chat agent that can answer questions and take actions.
              </p>
            </div>
            
            <div className="bg-card p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Cross-Device Sync</h3>
              <p className="text-muted-foreground">
                Access your tasks and notes from any device with seamless synchronization.
              </p>
            </div>
            
            <div className="bg-card p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Calendar Integration</h3>
              <p className="text-muted-foreground">
                Connect with your calendar to manage deadlines and schedule follow-ups.
              </p>
            </div>
            
            <div className="bg-card p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-3">Data Insights</h3>
              <p className="text-muted-foreground">
                Get valuable insights and recommendations based on your tasks and notes.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      <footer className="py-8 px-6 border-t">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted-foreground">
            © {new Date().getFullYear()} Momentum. All rights reserved.
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link 
              href="/privacy" 
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Privacy Policy"
              tabIndex={0}
            >
              Privacy
            </Link>
            <Link 
              href="/terms" 
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Terms of Service"
              tabIndex={0}
            >
              Terms
            </Link>
            <Link 
              href="/contact" 
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Contact Us"
              tabIndex={0}
            >
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
