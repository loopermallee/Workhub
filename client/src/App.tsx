import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import Home from "./pages/Home";
import NewsPage from "./pages/NewsPage";
import AdminNewsPage from "./pages/AdminNewsPage";
import LibraryPage from "./pages/LibraryPage";
import LibraryBucketPage from "./pages/LibraryBucketPage";
import ViewerPage from "./pages/ViewerPage";
import AdminLibraryPage from "./pages/AdminLibraryPage";
import NotFound from "./pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/news" component={NewsPage} />
      <Route path="/admin/news" component={AdminNewsPage} />
      <Route path="/library" component={LibraryPage} />
      <Route path="/library/:bucket" component={LibraryBucketPage} />
      <Route path="/viewer/:id" component={ViewerPage} />
      <Route path="/admin/library" component={AdminLibraryPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider>
          <Toaster />
          <Router />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
