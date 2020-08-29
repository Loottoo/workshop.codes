class FilterContraints
  def self.matches?(request)
    request.path_parameters.without(:controller, :action, :page).length > 0
  end
end

Rails.application.routes.draw do
  concern :paginatable do
    get "(page/:page)", action: :index, on: :collection, as: ""
  end

  root "posts#index"

  get "/404", to: "errors#not_found"
  get "/422", to: "errors#unacceptable"
  get "/500", to: "errors#internal_error"

  get "sitemap", to: "sitemaps#sitemap"

  get "admin", to: "admin#index", as: "admin"
  namespace :admin do
    get "posts"
    get "comments"
    get "favorites"
    get "users"
    get "notifications"
    get "email_notifications"
    get "activities"
    get "post/:id", action: "post", as: "post"
    get "user/:id", action: "user", as: "user"
    patch "user/:id", action: "update_user", as: "update_user"
    post "users", action: "find_user", as: "find_user"
    post "posts", action: "find_post", as: "find_post"
  end

  namespace :wiki do
    root to: "base#index"
    resources :categories, param: :slug, concerns: :paginatable
    resources :articles, param: :slug, concerns: :paginatable
    resources :edits, concerns: :paginatable
    get "edits/article/:group_id", to: "edits#article", as: "article_edits"

    post "search", to: "search#query", as: "search"
    get "search/:query", to: "search#index", as: "search_results"
  end

  resources :users, param: :username, except: [:new, :index, :edit, :update, :show]
  get "account(/page/:page)", to: "users#show", as: "account"
  get "account/edit", to: "users#edit", as: "edit_user"
  get "account/posts", to: "users#posts", as: "account_posts"
  get "account/accessibility", to: "users#accessibility", as: "account_accessibility"
  get "favorites", to: "users#favorites", as: "account_favorites"
  patch "user", to: "users#update", as: "update_user"
  delete "user", to: "users#destroy", as: "destroy_user"

  post "analytics/post", to: "analytics#post", as: "post_analytics"
  post "analytics/user", to: "analytics#user", as: "user_analytics"

  resources :profiles, param: :username, only: [:update]
  get "profile/edit", to: "profiles#edit", as: "edit_profile"
  get "u/:username", to: "profiles#show", as: "profile_show", concerns: :paginatable
  get "users/:username", to: redirect { |params| "u/#{ params[:username].gsub("#", "%23") }" }

  resources :sessions, only: [:new, :create, :destroy]
  get "/auth/:provider/callback", to: "sessions#create", as: "oauth"

  get "register", to: "users#new", as: "new_user"
  get "login", to: "sessions#new", as: "login"
  get "logout", to: "sessions#destroy", as: "logout"


  resources :forgot_passwords, param: :token, only: [:index, :create]
  get "forgot-password", to: "forgot_passwords#new", as: "new_forgot_password"
  get "forgot-password/:token", to: "forgot_passwords#show", as: "forgot_password"
  post "reset_password", to: "forgot_passwords#reset_password", as: "reset_password"

  resources :favorites, only: [:create]
  delete "favorites", to: "favorites#destroy"

  resources :comments, only: [:create, :update, :destroy]
  get "create_edit_form/:comment_id", to: "comments#create_edit_form", as: "create_edit_form"
  get "create_reply_form/:comment_id", to: "comments#create_reply_form", as: "create_reply_form"

  resources :notifications, only: [:index], concerns: :paginatable

  resources :activities, only: [:index], concerns: :paginatable

  get "on-fire(/page/:page)", to: "posts#on_fire", as: "on_fire"
  get "while-you-wait", to: "while_you_waits#index", as: "while_you_wait"

  post "copy-code", to: "posts#copy_code", as: "copy_code"
  resources :revisions, only: [:edit, :update]
  get "revisions/:id(/:compare_id)", to: "revisions#show", as: "difference"
  get "raw-snippet/:id(.:format)", to: "revisions#raw_snippet", as: "raw_snippet", format: :json

  get "/(categories/:category)/(heroes/:hero)/(maps/:map)/(from/:from)/(to/:to)/(exclude-expired/:expired)/(search/:search)/(sort/:sort)/(page/:page)", to: "posts#filter", as: "filter", constraints: FilterContraints
  post "/(categories/:category)/(heroes/:hero)/(maps/:map)/(from/:from)/(to/:to)/(exclude-expired/:expired)/(search/:search)/(sort/:sort)/search", to: "search#index", as: "search_post"
  get "/search", to: "search#show"

  post "parse-markdown", to: "posts#parse_markdown", as: "parse_markdown"
  post "get-snippet", to: "posts#get_snippet", as: "get_snippet"
  resources :collections, param: :nice_url, path: "/c", concerns: :paginatable, only: [:show]

  constraints code: /.{5,6}/ do
    resources :posts, param: :code, path: "", concerns: :paginatable, except: [:index, :show]
    get ":code", to: "posts#show", constraints: lambda { |request|
      request.params[:code].present? && Post.find_by("upper(code) = ?", request.params[:code].upcase).present?
    }
  end

  constraints nice_url: /[a-zA-Z0-9-]+/ do
    get ":nice_url", to: "posts#redirect_nice_url", as: "nice_url", format: false, constraints: lambda { |request|
      request.params[:nice_url].present? && Post.find_by_nice_url(request.params[:nice_url].downcase).present?
    }
  end
end
