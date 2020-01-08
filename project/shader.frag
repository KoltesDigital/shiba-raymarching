#version 450

precision mediump float;

uniform float time; // shiba time
uniform float resolutionWidth; // shiba resolution-width
uniform float resolutionHeight; // shiba resolution-height

uniform bool applyMod; // shiba control(default=0)
uniform float modInterval; // shiba control(default=10)

uniform mat4 cubeMatrix; // shiba control

uniform vec3 background; // shiba control(default=(.5,.5,.5), min=0, max=1, subtype=color)

uniform float vignetteFalloff; // shiba control(min=0)

// {% if target == "library" %}
uniform bool overrideMatricesSet; // shiba control
uniform mat4 overrideInvViewMatrix; // shiba inverse-view
uniform mat4 overrideInvProjectionMatrix; // shiba inverse-projection
// {% endif %}

#pragma shiba fragment shader

float sdBox( vec3 p, vec3 b )
{
	vec3 q = abs(p) - b;
	return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float sdf(vec3 p)
{
	vec3 index = floor((p + 5.)/10.);
	if (applyMod) {
		p = mod(p + modInterval * .5, modInterval) - modInterval * .5;
	}
	p = (inverse(cubeMatrix) * vec4(p, 1.)).xyz;
	return max(sdBox(p, vec3(1. + sin(time * 1.1 + dot(index, index))*.2)), -(length(p) - 1.1 - cos(time + dot(index, index))*.2));
}

vec3 normal(vec3 p)
{
	vec2 eps = vec2(.01, 0.);
	return normalize(vec3(
		sdf(p + eps.xyy) - sdf(p - eps.xyy),
		sdf(p + eps.xyx) - sdf(p - eps.yxy),
		sdf(p + eps.yyx) - sdf(p - eps.yyx)
	));
}

void main()
{
	vec2 screenUV = gl_FragCoord.xy / vec2(resolutionWidth, resolutionHeight);
	vec2 uv = screenUV - .5;
	uv.x *= resolutionWidth / resolutionHeight;

	vec3 rayOrigin = vec3(0, 0, 5),
		rayDirection = normalize(vec3(uv, -1+length(uv))),
		marchingPosition = rayOrigin;

// {% if target == "library" %}
	if (overrideMatricesSet)
	{
		rayOrigin = overrideInvViewMatrix[3].xyz;
		marchingPosition = rayOrigin;

		uv = screenUV - .5;
		uv *= 2.;

		rayDirection = normalize(mat3(overrideInvViewMatrix) * (overrideInvProjectionMatrix * vec4(uv, 0., 1.)).xyz);
	}
// {% endif %}

	vec3 col = background;
	for (float f = .0; f < 1.; f += .01)
	{
		float dist = sdf(marchingPosition);
		if (abs(dist) < 1e-4)
		{
			col = (normal(marchingPosition) * .5 + .5) * (1. - f);
			break;
		}
		marchingPosition += rayDirection * dist;
	}

	float vignetteRatio1 = sqrt(dot(uv, uv)) * vignetteFalloff;
	float vignetteRatio2 = vignetteRatio1 * vignetteRatio1 + 1.0;
	float vignetteExp = 1.0 / (vignetteRatio2 * vignetteRatio2);

	gl_FragColor = vec4(col * vignetteExp, 1.0);
}
