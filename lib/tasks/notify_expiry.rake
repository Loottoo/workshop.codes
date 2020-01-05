include Rails.application.routes.url_helpers

desc "Notify posts that are about to expire or have already expired"
task :notify_expiry => :environment do
  posts = Post.where("updated_at < ?", 5.months.ago)

  posts.each do |post|
    if post.updated_at < 6.months.ago
      has_notification_been_send = Notification.find_by_content_type_and_concerns_model_and_concerns_id(:has_expired, "post", post.id).present?

      Notification.create(
        content:
          "==⚠ The Code for **\"#{ post.title }\"** has expired.==
          **Workshop Codes in Overwatch expire after 6 months**. After this the code will no longer function and **your code will be lost**.
          Your code is now most likely lost. If you saved a Code Snippet (Either on Workshop.codes or somewhere else) you can generate a new code by copy and pasting the snippet in Overwatch.",
        go_to: "#{ post_path(post.code) }",
        user_id: post.user.id,
        content_type: :has_expired,
        concerns_model: "post",
        concerns_id: post.id,
        has_been_read: 0
      )
    else
      has_notification_been_send = Notification.find_by_content_type_and_concerns_model_and_concerns_id(:will_expire, "post", post.id).present?

      unless has_notification_been_send
        Notification.create(
          content:
            "==⚠ The Code for **\"#{ post.title }\"** will soon expire.==
            **Workshop Codes in Overwatch expire after 6 months**. After this the code will no longer function and **your code will be lost**.
            Make sure to generate a new code and update it here to prevent losing your Workshop Item forever.",
          go_to: "#{ post_path(post.code) }",
          user_id: post.user.id,
          content_type: :will_expire,
          concerns_model: "post",
          concerns_id: post.id,
          has_been_read: 0
        )
      end
    end
  end
end
