// Set the current year in footers
document.querySelectorAll('#year').forEach(function (el) {
  el.textContent = new Date().getFullYear();
});

// Newsletter signup handler.
// By default this is a front-end-only placeholder. To collect real signups,
// point the <form> at your email provider (see website/README.md) and remove
// this handler, OR wire it to your provider's API here.
function handleSignup(event) {
  event.preventDefault();
  var form = event.target;
  var email = form.querySelector('input[name="email_address"]').value;
  var msg = document.getElementById('signup-msg');
  if (msg) {
    msg.textContent = 'Thanks! You’re on the list: ' + email;
  }
  form.reset();
  return false;
}
