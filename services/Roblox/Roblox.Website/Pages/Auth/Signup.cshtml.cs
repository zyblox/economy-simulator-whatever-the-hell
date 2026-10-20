using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Roblox.AbuseDetection.Report;
using Roblox.Dto.Users;
using Roblox.Exceptions;
using Roblox.Libraries.Captcha;
using Roblox.Logging;
using Roblox.Models.Sessions;
using Roblox.Models.Users;
using Roblox.Services;
using Roblox.Services.App.FeatureFlags;
using Roblox.Services.Exceptions;
using Roblox.Website.Controllers;
using Roblox.Website.WebsiteModels;
using ControllerBase = Roblox.Website.Controllers.ControllerBase;

namespace Roblox.Website.Pages.Auth;

public class Signup : RobloxPageModel
{
    [BindProperty]
    public string username { get; set; }
    [BindProperty]
    public string password { get; set; }
    [FromForm(Name = "h-captcha-response")]
    public string hCaptchaResponse { get; set; }
    public string? errorMessage { get; set; }
    public bool signupDisabled { get; set; }
    public string siteKey => Configuration.HCaptchaPublicKey;

    private void FeatureCheck()
    {
        try
        {
            FeatureFlags.FeatureCheck(FeatureFlag.SignupEnabled);
        }
        catch (RobloxException)
        {
            errorMessage = "Signup is disabled at this time. Try again later.";
            signupDisabled = true;
        }
    }

    public async Task<IActionResult> OnGet()
    {
        FeatureCheck();

        if (userSession != null)
            return new RedirectResult("/");

        return new PageResult();
    }

    public async Task<IActionResult> OnPost()
    {
        // Error messages are intentionally vague. Let's keep it that way.

        FeatureFlags.FeatureCheck(FeatureFlag.SignupEnabled);
        var ip = ControllerBase.GetIP(ControllerBase.GetRequesterIpRaw(HttpContext));

        try
        {
            // Initial cooldown check - to prevent people spamming attempts
            await services.cooldown.CooldownCheck($"signup:step1:" + ip, TimeSpan.FromSeconds(5));
        }
        catch (CooldownException)
        {
            Writer.Info(LogGroup.SignUp, "Sign up failed, cooldown step 1");
            errorMessage = "Too many attempts. Try again in about 5 seconds.";
            return new PageResult();
        }

        var usernameValid = await services.users.IsUsernameValid(username);
        if (!usernameValid)
        {
            errorMessage = "Invalid Username. It must start and end with an alpha-numeric character, be between 3 and 21 characters, and contain at most one special character (space, period, or underscore). There are also some words that cannot be used in usernames.";
            return new PageResult();
        }

        var nameAvailable = await services.users.IsNameAvailableForSignup(username);
        if (!nameAvailable)
        {
            errorMessage = "Username is already taken";
            return new PageResult();
        }

        var passwordValid = services.users.IsPasswordValid(password);
        if (!passwordValid)
        {
            errorMessage = "Password is too simple";
            return new PageResult();
        }

        if (!await UsersAbuse.ShouldAllowCreation(new (ip)))
        {
            errorMessage = "Registration is not available at this time. Try again in a few hours, or contact a staff member.";
            return new PageResult();
        }

        // Check captcha before creating the account
        var userIp = ControllerBase.GetRequesterIpRaw(HttpContext);
        if (!await HCaptcha.IsValid(userIp, hCaptchaResponse))
        {
            errorMessage = "Your captcha could not be verified. Please try again.";
            return new PageResult();
        }

        // Created user, so add final cooldown
        var signupFinalKey = "signup:step2:" + ip;
        try
        {
            await services.cooldown.CooldownCheck(signupFinalKey, TimeSpan.FromMinutes(5));
        }
        catch (CooldownException)
        {
            errorMessage = "Too many attempts. Try again in about 5 minutes.";
            return new PageResult();
        }

        // Now make the account
        UserId createdUser;
        try
        {
            createdUser =
                await services.users.CreateUser(username, password, Gender.Unknown);
        }
        catch (Exception)
        {
            await services.cooldown.ResetCooldown(signupFinalKey);
            throw;
        }

        await Roblox.Metrics.UserMetrics.ReportUserSignUp();

        var sess = await services.users.CreateSession(createdUser.userId);
        var sessionCookie = Roblox.Website.Middleware.SessionMiddleware.CreateJwt(new Middleware.JwtEntry()
        {
            sessionId = sess,
            createdAt = DateTimeOffset.Now.ToUnixTimeSeconds(),
        });
        HttpContext.Response.Cookies.Append(Middleware.SessionMiddleware.CookieName, sessionCookie, new CookieOptions()
        {
            Secure = true,
            Expires = DateTimeOffset.Now.Add(TimeSpan.FromDays(364)),
            IsEssential = true,
            Path = "/",
            SameSite = SameSiteMode.Lax,
        });
        return Redirect("/home");
    }
}
