require("regenerator-runtime/runtime");
const Runtime = require('../../engine/runtime');

const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const formatMessage = require('format-message');
const Cast = require('../../util/cast');
const MathUtil = require('../../util/math-util');

const blockIconURI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAA/CAYAAABQHc7KAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAAhGVYSWZNTQAqAAAACAAFARIAAwAAAAEAAQAAARoABQAAAAEAAABKARsABQAAAAEAAABSASgAAwAAAAEAAgAAh2kABAAAAAEAAABaAAAAAAAAAEgAAAABAAAASAAAAAEAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAQKADAAQAAAABAAAAPwAAAADO6VitAAAACXBIWXMAAAsTAAALEwEAmpwYAAABWWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNi4wLjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp0aWZmPSJodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyI+CiAgICAgICAgIDx0aWZmOk9yaWVudGF0aW9uPjE8L3RpZmY6T3JpZW50YXRpb24+CiAgICAgIDwvcmRmOkRlc2NyaXB0aW9uPgogICA8L3JkZjpSREY+CjwveDp4bXBtZXRhPgoZXuEHAAAq/UlEQVRoBb17B2Ac1bnuNzuzs00r7aoXq1qSbcm9G2xjg4FQjImJbQgJJXBtzA01AUJuiAWBXAKBJJiQ2EkoCRCMUzChGTC2wQ33Jsm2ZBWra1VWZfuU952RTdpNLnn3vndGo9mdnZlzzl+////PSPj/3EzTlNiltHHjRqkmo0bahm0jI9jOwwXAggULIE5VLKgwa1BjrsEaU5Ikc+Si//3/YjD/zxsnbdtYs1H5pPkTae3etTqqoH3uTk3IVTVVsri+oqJCXy4t1z/3vZ/jwv+nBFi3f539mYZnpOrl1fG/HYu5zJR/++hv/TvcO3wFHQWOI68ckZsnNBuP3PJIODWcGpU98sAkTAr97X1VZpWCGtjWVKxJ/G9Ixv86AYSIP7ztYblqYZXglCW64ty22m2VHVrHjEFpcEpCSoyR/Mg6FDiSmdgRS84pybHH3XH5TFeLkZaXHi3OLYqryY5+I6x3SFGpXtKko7aQbZ92S9vh+47+8DOiVG2tUtYsWKP/Twjxv0aAZa8vkytrKqWqqqrPxHtr3dbZLZGWFUPq0EVRZ3SslGGzm24ggRhOB06jeH8RPEVutBS1wlSBeDiBnq4A4j0x+NL9yCzNhBdJkGGHFkxAikvNalzdYarm73+U+drmdulAWEjI6+brcs22GolE/6zvv5Wcf/T9f0wAwd07196prr1zbUx0smjZopS6BXXXXzvzupt8eSkzpBwbz5qIchvUBo1hJWQcOLLfvLvtLhhzDOkN9ybYYjaJz4Ek2aAqdlOLa9BbNBNtgFagw1votaXb0mWPwwPFZofcK2NwZ7DLm+F5dM2cR35OCbAmPm3/NPsD0x4w/hU78T8igBDBqu1VBo2aQc7b2tLa7k3KSrp3XPaYHNPDwZua2Sq36dvcW6WAv1sqTxkn7Tz2ifRa4jX0zwziy5EvY27sfCRMHaZhcjcspZFtChSngox4GooaClEfO22eLDltpjvSMaVmvFF+pkyKzIjKWqkOZ9zVEu+JbyzuLV573ZTrmkhtIREqifB3dkf89rft/5oAwsCtmr4qIR741OGnVpzec/qByssrpgzlD0PWbXE1ptqyozlKvj4KjpADR/qO4Gt9t+BNz5swC00saVqCRfGLIBkSFF2GrutQJDsM6FQRDRK9ZdgRQcKZwE3Rr6LZbIFLUjEpNhHbJu5AQ2qT7o/6kO5OkzPVLOjtxnCWmfmjW/Nu/R4lIrHOXGdfiZXaf2cf/mUCCE7nXJkji8k/cd8T2f6VqetP1p9YbBQbSBqTFG+Nt0pdWre9W+7GvsRepPdl4eG+72Ll2JUIR0JI9qfghf3P4/7YXVic8iX02/ohKRIiUgQ2mw06pUE3SAxThltzY29kLxZ7rsJ96j2Id8fws/B6/ER9FhfaFkJKleBJ9iZSPMlGuivd4Tf98PQknZowavzKS6RLtpM3Er2GXCX9Y9vwLxFAGLrXl70ugInx+G8fvyLtwrSXO4Idvr6OXt2YbxqdkU570AyiZ7AH7jMuVHRUoMRVgvaMDtyafSsKcgtwPHwck41JWN2wGr/JehmzbbNxOtEAp+SEZQcgwWaSEJSFLKTjgHQQj7c9isvdX8AG10bUHjmBowXV8Kk+xHvjsBk2uJwu+NJ8WnZmluGT/WqWloXi1OKqFdKKh4WECiMp7IKwV4IoYvzivGifmwBi8huXb7RAyJMfPflg9sLs7x/rq4a6TY6bSwz7Tm231NHdiaLThZg0MBE52dkI50RRn1aPF068gBpfNT5M34I7e+7E25lvY6GxAI/VPYbHMr6PefZ5aNVaIUuyRQQxMJ+RggPyQawK3IKvh27DiyTWU+6f4NLgxTCPm6if1Yh0RxpoWyGFJehBnaonIycrV/PY3UpFQSUK7QWbrsf1yznh+DvmO47LpcstQ01C2M4R4XMR4C8n//T+p3+WNS37tv3Gfih/tGl5l+Ypd8fuwSWHLsaM8Az48/3oyuvCTmUXdhm7gB7greCfUDJ1NCo6K3Cx/WJ8EPsAr/hfwbXqCjxV+xTu9z+AOc45aNc66PJscJgOnLCdxoShsfhp01M4kn8MX0+5FzNjM9DibsfE9gqEa8NoPL+FMpIKWZbhkJ1QYjLiwTiSkWwijMSUqVPUfE/+gZK1l55/+Z1lsQ/2bZ8iDdgGFi2a17B161Zl4cKFmiKo/c8adchGHbI4v+7MuheT8j03VuNYom73Sfmy0Zcpf2p6C3ccuwNFYwvROKkRbyvv4nD0EIqjxUglhy7qXohZk2bjvoH7wLmhx+zB+er5uL7/esR8UdxX+U3Yam34pnQfZqmz0K63Q6WrM/U4Hmp5AN0pAWvy4/Rx6FP64Qo7cDj3OKYPTEbO0Ux0T++BN5SEmC0Gl+KCK9NF9wNJT9Lthz85FB+XNmZacNG+dZzjTZ6+pLzUouQ1/Hz19u3brWn/dwSQLsAFwpEbDxx94Km+1P4b9/Tsib/Q/4LyTPwntqKUIkzunQT5IgUb5d9jT2w3MqKZGM8tw52BrZ1b8UDmAzihnsCLAy9ijjIHp83TSOE23zEfXxu4hRyX8Y0x9yBSF8FDqd/FQtsF2Cptx2Mta2gDMvCtPDFeWNeFpBAURYEjasfJMfUYt6sM/Q39iBRH4QirCGthmAkTQ/ZhFLrzpRWJa9S2U+2RrkW9N/7c/Plo7XDih+mpqUuoAnOpAjt4VP8pAe545g51obQwlrYi8/aUT733LgzOSyzJvEJZFrzGNmP8dHQp3bjC/QNBcWufapsCJ1yWJd8a34rVQ6tRNL4Yq4dXW9zvRBdUbmEzjDPGGZxHgtwYvAnuFDe+kX03Aq3deGbUs7i+71pcPHQR/lT4DnbZd2NyYhK6bT3Eg4plHBXihAF9AB2Tu1C+oxT70g7B5/ZBTtg4FA3tSheW7lqMruRubLxwk8teLWsxKTLXnZ2UP80+CeHw0Dc54h3cE//QBlggh9DyreBb/p21O2uLsguySnNKE1k9WfaxqeUIcRKJIQ2Bvm4cih/GO/K7eNn1CuAApjmn40BgPw7Y9iORr2F272ycbz+Pro4Wi00ncEtwF5tPSsFebR82O97BxP5KfLn/BjyY+CY0TwKXZy3F7MRM9hWBQdeYMEfuMUzDwg+9zn6c1zQT4ZYwjsyuQV4kC31JA5hyfAImfjIB+24+CPID7l43aF+NsbYJtm9n3I+e0IBWdkPVVHz84rH/kgALqhYo26q2Cb7m/qD1Bx9KedK44ziu/Xrbr5UN0mtYMv9KPNT9MMrspVjgXIA8LQdaSEPdcB12aLtwt3IPrui9HC9WvIT7jfvxwvAL1sQ5X87+7C7CJO5e+u5sKR11eh0+kbcgM5KO3kQfbsu8C0floyP3CSUcQdTW9ywjG14jiXbChGpXMWXXBBzLrsGZsnaUdRVj4g/Go/XOdjTltiBDS6NUOqH1JegaK/SnvVVayOFx5O8+/Sgum/zQ36mAADpr1jDCqpJw18d3PK/mqeOOG8fjjdsa1O9pjyCY3Y8zwVY8qT8JRDieYWCV4zZ8ybMUU5ImY4oxGZcMLgIKaJHlGORqG56Wf4hMKRM+u49ozgWH3UG/ryKRiFvhoh7VEI2HEbINI2S4MGQO4Y7G2+Cxe3guhKgcRZ/ch06pG01KEw7YD6FerR8hCgmTPDkJhYdHoTb3NCa/MgHDi0M4kV+HlJAXw9KwhRPa7S0Y3zlLVv0OvT/GgadkXLXMNDnLv2mVr1eqIn4nxr9BGie9FMwIap/u+VRe0rlYOjr/OHIOZuO6addh2tB0zJXm0sv14IR5wuLshZ5FuN68DkvkK+F1etEVDaA90oa4I45hTiRoCyJEivWgl2LNyXKPmFHGhjG0GK24v/luJKlJeDLrxygxi5Fr5sAHP/yGD0kMLgQyNKIEywyWgrEBtCfIZfMM9qUcQFlrMVL2pyCYO4D3r9gGJWSDU6P8M5mUbEvGkNqPWbWX4EdTHzE6wn22sYFkjCpNn/RXEvD660RMy5fHe83e5Cd3P/k9KV1CTV2tueDEXGnoqiG80vcK0dhvEbIzJKc4m3YTAvmVc8t352PL4IfIbczABWPmISXJj5gnTh0+zxJ1AvyRdo7k4ih2oQp24DutDyAjnI6X8l/FH+2bRlRl5I6Ra3itRKJemjQXZeZo5Om5SI+mYjLtRmmgAKHBKLSwhpPp9dDbOLhkGQPuAXg0DwlmoNfogpIrgBZskmEkkJJqD4cw868IsBzLrS5fq3/tHq1IK2jvbY9lbkl1hC+NYKuxwxL3DE86LXDQGpRBuGo3FHI7CVuCW/DD1h/gxvE34ufyeiwILcTctLm4deBW/NL8JRbKCy1Om+QI0b61uUwndqg7cXP3Dbi6/UrsLt2LHzvWkmizLCMp4gEbN5P9xIwY+sx+vGe+y/0sZWhwUcxdm4TzoyoqMybA35yCInsB3NVO9KUF0Zvfh3BKBP1SELqNBkgQXYxekqBpmPYZAegT6RolvcPsyPh5zbo72+3tGNo5JKdN82Gr52Okxwg7yUVfsg9n9FbrKQbD1zSCnQP9B/Fs+zO4ZuI1nPwv8FDou3jQ+Bbm+ubiavfV+GXol+jjNoBBIZEQRPCaSahV6jArNAtfaVqO1rR23J5xF6bqldTbIZqXGAjz6VLFWBkxEgm4aPgmmZOIFO0QsS4TB1i1P4ZO7xk8UtSP2GgDFcPl2FO+H+PLxiG5xQvvMS+iShRpYzJQTTySMBg/SDaJBgimrI4RttVq67HeIgb9980DycHU5v3NcTXJrjSLbM0QITeRlujVpTgxaAwQGtG9qC4cZpj7XPuzWDp5KR6XnsRDww9hqjIFT0nPIjDcSRmbZj0/RO1XGe7aubu56bKBsD6IB9vvgc/lw2+LN0AmcQyiQLuUQCb1Ik9XUEAJyyPGT6XFd5hxEoa2gzbksNqDm05HsPpSB277YT5+eWAc9ntOwvBruODEeTiSdARNZc04M7cFUrGE0XWlsNHpCeJDYtgZj/IzCi0CCO6vklYleFT6lf5b9+z6FEkBjxyrjCMajVpcC+nUe94rJhBLkBgUv63927C2/ce4etISPKp/Hz8J/xjnK+fxMpMeYBh7hvcgQ0/Hf8jfRj03a+IMxJy8uUaqwTM9T6IiPBZv57+HDc4/kChTcdgWxiGnjN1Mne1IEruEXUyu7HMCRxg2a2ReClWDF6O8XsLhB2M4dEUYX10M3Ndqx8ul9SgayEVGb47FJD2h40x2K5rmNMKeRx5TCzg+m5AACnCmRYBz3P+d9ru5LU2tZf5DyWbGwgy51dNmwUtxi6GPZGsok3Q/3EmPH7U9gaUTl+L7xhN4LvKcBXXrOFHmcwR2xWb9fYRDg1hkLLCkQJx3my4cVA7h34Zvxhf6LkZ1di2+m/YoplGPD/9aR0uVC4desOPj38nYtEXBLw7Y8Gi9DbcFbFgUk9BAAuwiMZgsxKczDUz8TxPlh4Dg5RqjQT/gPIJYXgzj68vRqQQIgJgziLsxFA+iM522izMWWsUJiTF5LLH/cPmHlmn46cU/1Qpy8lFeWI5YbQzlwdFoT+lEvb2BD2u3bo7HYmiKNOPGpq9gxbhr8Zy0Hs+G11qTbzAZ19uclq6XSqX4qfIz3By6HqW2Iix0L8QR6Rgy5HSMjpfh1q4bMOgZwjPpz/C52Vh91I6SDcQFThMZfyT9WiwacowcK/8LJxK5iHZ4tISeEgODTIZ8WmHg+fd1jDlh4vnrDTyea0NeyIPakkaUvl8E74AHhtcQqTkmWxSocXLFaiOWkB8liwANDQ1kKVAypeQyp+6AFICR9nKqnJeeg8klE2AU6hgsGsLxaA0G1QHMG56DouwSbPT8AY+GHsVc+/m0C4MYJeVZ5I1zuClmMglXj12R3VgeWoqltiux1buVlrwHrwSeR5qRhp9m/wJb5d28Zxb8wUF0z7Chr4CjopQZHKs4CnbZaXscwzSc7QaSiW6z1wslM+B7QMKWKw3Mv5lebxAoNCgFRgYOuo+gKH8UyupLcHLGaaTFU6HRrmg2QUrRrOlan5RzCcSt5tbJW+q33Ff9w2PIXJpJ/BRCWp0fKX3JSD+ShtHNxZiTT1zOX8bK5ahJOYW7Bu/m57HYYey0pMOCq4K4FLN8M58J7RS859iCRcGFmCpNIvqinvbdjVnB6dietwM/cq/FPG0mPqF32DVRwlVLDRQKDT27aUWcJpFmdBJdp8tEzReYLaJNnbc/gZ3PyCjYp+GGh028/KKMDvZJrcAwLakn4UFbWQdy38vBp5WHkKGkkSWk4p8Zb01e/FNYf7O+ENHNC0QC9s7kTl0qtNkaM5rhLHEgI5SGnJ4sjOrLRX4iD0MtJI0vjKxIGra7NyPmimNIHkLIEUJA6aGqdKFFacUJpZ7fB/GO5z1c5/wSkyVT8a3+b2BxzxfQ5uvALam3o1KvoH8OUf+ZWM0FvvAq0+pf1lHzkA29BGH+AG0WJ+5vphT0CswhY+rdcZz5GgnBsHfUbzTs/JmMQw4J5XETMeHbGWRlaKmo8Z5Cfs4ojG8qR2/lAENoFYbIhAnmf0YIEqDqbLKjo6djQjAYhDlVMkPBkMR4gc6mD6eS66Gl6hgI9+Hr21dhUngiBpxB9Kl98A35kBb1I9eZBWeMlokPFpGeALchWnNBmE5nt8gSE/JGsKJrKXTFwFPZP+RAWAOgNwjTsbn5WVjnjedJmMMPKU0m2otkFN4Vw3t/cmD5Nx24usPAc6vCBKA66meqmH5bDF2LJXx7sdBik89gsoWPEV7OpJGO6wn0lvdRSkbhRHkT3A4D3mYXJCEm4qKzTdxtmcPOxs5yJcMOV4AkJ0dE4OnUHMjWM9FudmH28ZlI7UpFZ14nPP0e/Hz6r9Agn8EliQUU23yM0nJ5LdOYehqSE8lIIgTNjWejcLgAUXvMCmhcdIBv5LyNPxDqztSnY4DBj0iAhjmg6YzM12dKuO4FGRfcHEXzTCdic01cfGcEl9Mf3v9mDJmbY9jztAsFRzg2jm/9f3iwk25yZshEK2eiksEMlMkEnbiBgC21FVMcE5EfyEJjPnOItSkwSzl5zu9cs4wg/b/nzg/vzHXmO2AwLY24nVRhzE7ILPLyg4FBzPlgJnq/1IufJq3HE29/D5ODE3Aquw4fUoPjdlaohFiRA6IVmoWYaIxHAfF6TjwH83rOg1dPYgzPC0TnHIPI/dtEkpaTF1mJFGHw2N6Yq2AqLyjYFcfJaxTMuCeEb26KYRwJ0bBKFbei+GdhfPILNx4YJ2NKyEAHZ0EGU8StR/D5I8ixTelEZd5YpuZToXgJpAK8n/GL9BdpEGvIm3s2J8dtcb/dyRqcpEsGHyoqNUydokFrweW7LoJSqOCD8q30nMAAkWBWINPqrdQoRKVWgUn6REzSJmKcPhZxWtzdyl4S6xeI6lEkx73oc/QjrIRxUeACjDIKMETdlyyqkW6cVT9HMjNq4id5DMB+ZEf6b6NUF56fJWP0ligO/cyJ9koZlfeG0LbcjgcXO6DSDkR4s3BuI+Q7SwAh4hy78J/9OUFkh7Mwet9odI7vpdITDdKznO16hGendpxyS07JYZMZeKikEBkq8u1RJYaixjwU1RSiduEpnEIdgQbQlRmAryUFSXoy+hjiDokQV6LFkDhJWoA8I4f6GMBdfbfji62LEVfieGTUEziUfBQ5oWzcPPxl1NvqCG0pcWKUbMLPEx1b7a1LVMqHiezaOFquVJD6+yhCTgkFn0QIpRJ44dsu7GWkO4FSExVCxGutjL+4+5wUkAjpmh97fAeQJ1ES27LRO3YYrDSPXEMaiD5HJODMZqZT4RBlKpub0WLQoIGy40y0E5N3jUdkegzv5mxBcbjIgsBn8lthb7RjcqgSXSJXZzJU4S7KWW5SaL/tKOZH5+HytkusQOb3ozbhY8cn2J90ECElhAv65o6ogUTXxCYGr3ASfWTlVMb7jxXKaHjQjsznIggnSxiYY8Ocm/uRtpFR6QYvHhmtYBqvG+DoBaMt7ouJf/ZZkEQwm+RiviFLy8As+wzcsmeJJdnniFTAiywCvG+8rzqSHarIqAoOmwQdtgSLDC2pyGjLIJg4BUMT7JGQSgBzIu8U4v1xFHXTa8uMqviLFWjzcRFRqWDO7paWryJzKAPbc3fgiaQfY3p8Gn7lfgn1ngbkDefi/qF7cVyuRjIjPJ1ITTyDimcFREInPrxaRAwxeHpZMj9fxIIJ1K1x49qLnTSuDI852bM9j3CU94pnCDoId0cFQZPahFs6b0Rudw7OMD22r+Qo46CzVCIUPk2CWwRI3JOoVQ31sC2Jlfh0u6EpdGXBKMZUlyMyM4Jd/v3IpzETuXdh3c+ktqA3sx85DVmWntFU0niaDFedaJKb8EjntzCmoxQ1WSdxT/q3UKwVcwLsih1+yuyNEPv5/edZ98YoBTKDGzF8G58xSNEtitHllSloX8bJ/iqMnkLWCXhPP6FuhD5/FCvnQ5yHGLy4b2TjF3EV7xfSe5qFlfON2biodgFer3wDXWVMp0ldZBhVXFDKxeQKI0KbqPrwa6T5tubj2qY4/EN+GCkGRu3KQU53NhonNsMXSyZlLU2zsrHsAc1jz8BT48Hs0AyisG6Lk7XKCXx5cAVm1E9FwNuD9XkvcJIy01lJRBRBjNYYH3ifR4ezA4WhfKwO/RuO2o5ZuQFRFBWhqth9NMCnGW3uvtGN5LYQbJqOXkrE2IcH8eWAjr38LZXX/IU3E7O3mnDfIn0miP3vgdvoYiPYUvgR/BlpOK+j0souG4wLfn7qHfzuvZthO1fvkxfJ2YnnY0j5VhJKjpQg991cxMbEsS/zsIXAxABVXaVxlJBmpuNYUTXig3Hm4kqJsRNWwnJiYiIuqp4PM2biTyXvYrv9E0zRJ5Bbw4ibjA8ML8LyAD717YeDGGPeIKWA3BA5QVlYAUqA2IUqgCr39gSVZFORtzOMlrlOeNrDWMQgjTE5uU+J4X6O+0L0Y4S7NHc4LlXjIf0/UNw7Gk8XPWupdZ2jAbnedEbBCo13DF95dwWS+l4TEMxqrqylWQXeJ3yQ5kis56uIZ8RhD9oxr3k2fHoKuon8mtVmGqogUjQvWpJb0VUYwKijjL0JfvrkXiyuvxS+hmTsKzuE9SkvYHyikp4haPl7UQEapL/I1wvwUvJvEVADGDNUhqtjV1lS4KRHGCHAiHUeRzF/jRFf7dokpP9uEBECnjCJNPGDEHx0l83ksItSIKRZUFEgxDTWCQ+aB5EvF2JZ7Ev4OL4DNfk1loveJL0JNVflEyx1M7Vk3qbmM3U60iJSQj6plrNqcwMh5sUBxBzU930ejH28HPNePR9f3HsZLuy4ANlaJnrkfiuwOTT1MNRqFeOHxmHJ8JUo3JaPlsI2PFvwS+TH8i2YKzzDnwfJQgijxFP2U9hL9+SLpuDCofmWFAgANoILiOl5RxInJ5R8zxyB+QB/C13i/V4UPN2PmzppGKmGxDTWs8Xz7bT4wurzIfilfR2CbQN4IPdBlDhKEGMmSVwYTB6w6gg054bDMiCBgK1KLDtj0wajjbaIjdY1LtXrp01HI3H6LIreqjaGpRJyXsvGpJ+Ox6JXL8A1H12Jq08uht2rYjBjkIWJSZiwvQJDrmFsmvwOAszAupj4EJNXmb9TDbGrn53L0/PwZvK7CDK0nj442bINg8wDnjOGwkiGuSfFNPymkIHRF+0ofKwHuiqh7S4vdqWxGkyPFedkR/COzvS5D0eNo3jU+SjKAqV41HwMLC5CocjHqaKCMEdw+FxAZDjErCW5WamuYeWCzRyWjpqMqFTdbstoTkP/RUHC4DjqxzThxOhTKAiMQiZT3r7TXqRtS0XWB5kYm14GnQkH5SQHFHGg7srTqHc2Ip9IT3BZdGrtogPx+WzLMLOw1bEd+2gLLu1bhGWRJXjc+xTOM2fTn7DOL7Sbo5pKoPOxquO9b7gxe/wAzoyR8NJ8D/Y6NZTGddYZOG663GQGwoeNw5iuzsC1sWuxqfVNvD/mA0wxp6CTm6hHuglh281mKznCxVgm12NxTMoJBdUjo0qPpu/r7+nXFLtdUQYUI7hoQNKOJFDQmocdhZ+iLbcTRr6B4pkFyAlmIrMrgwmKJBE80bcCXN2IvG05uOPgSpjZ1M106iUTlNEkRoauMNf7hDFoH8KAPEiOxPEhqzxveN/BvND5WDS8EI97nsIuc8+ITJ+jlDhSeu+dwOOk0RRTN2sCTsyzuEpPQGKJ5IssqMW/H9t+hMa6BtyTcy8muiYiEGNKjCIiAi6DAZJqY7LnHCeE3sj2g8oyLNM3YiPWXLXm2F177zohe23jKYKmK82N09ksQTePQWqBD46YihhLXU32ZtTkEhgVxDE1MQVz35oDewPZyzCzYwqpzQV/qb2p8J9mEVwib1jpcbkIMxleK24FNpeNBQ4JDzu/DYPhW0Ihkc1R+GD4T4z9dYbQEXJ2gHzrRsAMoJFca4uewkGD1Sd2U8eB1/2lZAki8dxLrpfgb/RjkeNClGeXwyCWkG3C9I7UFhxcgiNiGyb/DeINNcjqmM+TvEdhJUhHFTPWXEbynQPf+aBzqHO8nCablAOE81lteV9jni0H9Y5GeKjXfoaZmeRAo6cVY+gCnfUqItkRuIJO9GT2EXT8gcFHDnEBM0kJH7JimchIcB1Hws8Q1U8jSMIwhnCH3UglVheEkVUZE1kPGBwYRrLDh2SPD3YHXa7C1WPMH2iyzvwUpcgII2gErWCs2+hGkAWa6gTXC0k+TOyYQIh9HqIT4jhFgv1XTaw/4+IYzetU1VgcR/H1G6otA7huzTpzVdUqVI6r/F3N9pp7FNlu0S7dn46AvweZTZmoHV8HOcIBcTBnWDSZEZ+MjH1pMBk57r/iEHIPZaP8gzKUF5Wi3d7NrghdXQ0WVLYGc84GCNETO7//euAXyE3k0tzRLtMs/0Z/HY/gUfzb4K3IYV1wlDQK2XI20uQ0+BQfvHIycuQcJvMLocrqiAFMoqqxuBrPiuONgrfRy6CsJdECFnjQYXDnUUSvp5ifFLUI0bfKoC/QgzczparPIujPCHbL+lt+FQ1Fvha/UtMD4YDc3tKGsQfK0HJ5G9psHXAT7na5+nBVyyXIX5uHvqv68PxlL6OoqRDLf7EUHdd14DcTX0NJrIQAiUlKGgiRmharQE1i9CRuR5VjuCu2mkhtJQunCWxQ/4B7U+5Ch9qNCqbHhT5bRBKE4pip6iPfxVF85/mJ+ngcNY9jl7oLc7LmoEfrQXNvE7hczlovpCoiBcasBnfRr5CiYLBfz1ZHybFgv/ar0tIpVSBm4uOsJsri3MXj1WtXrjjl+UZSIemntQ90KJ4tTvjKfNhdvg92LkTKsedg9tvT4Thix957D6LGfwoDrNtd8+ESlDeW4c1V76CZeUEKs1WPE4ZIQFw7qz69BEZZXA/wXPNTKNGL8GHaNtzuvwcfaZux0LcIj4X+E98xv4PzpDkMsrnokr5d3K8zoysSmwLtiXphnXQKb8tvQz/OBUElNlSCS/K6aShZwRPx2DxWrgsIulLPbkKl3RFvYnXBbUwtSn/0uJ1LCbwsZ3COAMayZVZcEFfy7e+F3hiCd9ir+1J96BoXgHxMRkmkCF1qF4p7CuDY5kDgoj4c89XQX7tZYsnE1qkfI9ofxewjMzCsDlorQAW6ExwTR5fmRIheYHX715DWk4pqqRZ3ex+y1OEZ4zmi3ziuS1phcbkJTYTBA2gxW63lNM1aE4a1YTgTdLfaKWwwNyD/5ChcZVuCI74j8KupmOeai8LkImT7c/BJ6g68kv4q1mY8i4fTH8F3cr9r/qr5RXuwfwBul4NJSavZhbB91oQ3EG3CVyac6B87gLYNLVJWXTr8Y/1o97cjoz4NRa5i+Kv9SHAJy5lxLYgYrLFxc8ZZjU3vR/X8GmKEDMxlGqxJZWZZd5JzGo2iFyfVU1je/0UUHs/nuoEOvJq+kem0YczSZ+AN2yZsCW1FibMUT9ifQDv1l6VNenA7zYWNtcJMGmEPqm3VeFl9GcUNxbiGG8YwFR4fZsxFKMwCbrPeBL/mwwRtAqYb0zGDS2wWJS3CVceu0BZ6L0Cf3v8qJWoXDb8iDP9fEYASYBHg/qL7n5uQP6E2+0u5atNbTfGCrVzvW+aC0sS0dMMkqAfsGJo5hNP+JqTRuosWM2PMBOXh/UkfoTepD1N3TKL/tVsZ4iSdIIR+f3RiNKYdmAItoDFPsBMbfX/E2MQYcppVDWL7/4w/jng8hhuSb7CkQCymEgso0inXUR5rbbXYoGxA+akyzGY9oa683goc6gwaaHqMbBpOYVyF7elnpqrPZAyaEoSryal39wXsvVN6Bk/saBYLpLD1gq3iYJkb64P4JyJDsUJEUCYlmPKtovQiFK0usZ/qqzNS/pQE/ykfUp/3sSwNtE/lmi+WkLyJJCt9ZsVnhKeq14Udi3bD9YkLS09fiU61g+GshGFlAJedvAgpR5PRUNCEpwvXYlQ8zyqjiarSVHMqtssf453gO8hSs7DOsQ6NeiPGYSxqzVqcsZ3B27a3kVudg5msJBljwUzydGvsLVxILfKQQsqEuokCrgiuDI+Jir6xZuhAyMy8JAeSB7df89UvdIiF1GKRpLj5ryRAnDi+7HgCr0N+6MKH3oyfib9cmlcqTbh2otZ6WTsay5sQdcYQ8TA/z6QJnRQ63J0I2PmSA3ltkDI50XRUl9Ti5HmnUPZGCbH+VJxmFmhx1+Uo2JrPmt4Q3pqwmT1LRHAWIBfdMlwm5KO3+HbsQQxHhnFtyrXWea43taRji7kFjqMq9Xw+SBNUJCrQTaCUIlaZmXstt+sRGVtKgMg1DjIuqQyPMyMfhuP2ax1KErw/e1V69RWxblhUwq2H89/fEYDcN7kg2vp9TPeY1cMNw2cK/aVq2eRJWvG8CkZgHsgDbhT8ejRmvT4XF++/DDMDc5FpFCPhSEaLSM6Tg28sfIshby9m7ZiByvgEjN82DmafiQNzDmOPdy+xfCFxeYy5BhHVSTR29ZjEVHqtchIv9b6AZCUZf3D/wVKFA9H96Dvch0UZFyO9NA1jY2PQwCq0QHZiBZhlZOkfrao0nxdzc2lOfIZpvK3HEl/SHcSlm1+VXr5dTEq8iWZN7uw/Cwj95QnxWaysXrlupf3fl//78O1/vHqJ7k16vyhVyRg8FjCjDcOSNtXEQHkADSnHMOowF0Z/lIuClALoBQxl8ygLqQkEMvPROL8Vk98Zj0sGmFZvduHUpa3YMOZj+vUyIkshgVR8of/ME4hJHEE/KpR5eMP4ECvC1+Mi58WoCdXi99V/xEP53wao4v7IKNhlhbZvPKcsfDx5SK6LJIrOzJGA5OP7K0xtcyI+tCzuzHBm7vRK3sXsBCvNlfYqqeoz7otzvPUfNbKFAe3ry8ykHat3vegtOnNNx6vtcb0vobZcFoBZF4cyKYEadxPk7jD8HSZSzziQ0ukgzGXZi/G64mUAMsBYLELeJDGsndeMWFofRZTWXfXAq9DDqNlIVWnjPflIc2VSdxlcsSCQmzSKS+L9jN+dXDRxmODpKDYPbcbvDC6gEjwUI+eu0jvEZY05wP14puU57Ez7VM96Pwnhr8RkluLfq5AqFlehSlu5f6V9/fT1fzV5MfN/TACxtp7qcP+mgLfXnvo9l9d2l8YsTTwWjdPl2PWwIdmYtNBZOdI5AGF541xEEY8QmMQSUOLcyRE364IKz8vijZBonOsSYqI2QTiqEbEZcDGr4WKcrzDZaShEayJlRjW4f9xVKOfKs183bsRkxxiMyy6CM11hiNSHBi6qrGcYe1oItPQedjN4GvB0m9trNieuav6quvjSq+C2uZ7dIG24Q0xyAXMe2/7BSxP/mAC8sarKJDokjmT7+nZtBV9tes7tVVIjXJvPCDPBJSaSHjcVk4h6BO+IFWCW2tLzj3zWGdPzz9qtc7xQZNg1Ei/GPUzihEicPh57SGCBTNIVlsZIOIb92E73h3CMD5XwNb8XeU43CUfvJ8epMGGuGBnSa6Qh4xvJpfbIkIoNKR8Fr5i/c3WV9P3XxLhX8kWq9dMP/B3nxW+i/VMCiAsEXLQupDQ8c3AoQ5ccT4Q18ybVpXL9HQlhGszSi1QzTbqV2SYxxIP57xxRRDfis0idn2ucu3VOxOd//sxrSByxaxahTL46I2IIicTiqhCu94mSUMyBUP1tmsgDOGBXnVxTdCgwhL0hvLDsDu8DG7nEYxmtPR07NkojL3mc6/dvj/8tAc7dsHK/SUrS2bLd9GbHDCmR+EY4HL/akeRzSMzn6cyxc5oJG8WED6UzYQmCoF3okeiE561dTJhrtKyz4hdhyfmT5Rb/8jdx7mz8Ll7vMHi/waP1qgdvttspCZLCxV7DgzGP276pMN311PJ8aa8Y30q+0LX+7Atd4vs/a6Lrz934upBcuQxcRsxFAKKt/mjMtCx5mVMxRc1pquJK5hj5vg9F2tAp8Ky+iFfhRjjPrvg3IhWCLCOfDcvU8Fn8blDMxXlBGCEV4ijeBjGZx5cYSDFbxZtoZ8LDhk2WD3mS7Ju47mHj7lUTmS1hW7ffvuzDaQbfyxaa+Lkau/vXW9XrTPssg1ZFzpy7+4s/eGtcRMdMLWFM4+LGcaRBIdUnkxPxshPy/Fz7c5d/Vgj+Jr5wwn+hJeIUn28bIk27GVY3UtFOMHd8IDak7Tv44ytrzz2R/dgeroFSVXm22Hjuh89x/D9WEScSXmzHxwAAAABJRU5ErkJggg==';

const EXTENSION_ID = 'gameballExt';

const gameballUuid = {
    /**
     * Services
     */
    genericAccess:                              ["00001800-0000-1000-8000-00805f9b34fb", "Generic Access"],
    genericAttribute:                           ["00001801-0000-1000-8000-00805f9b34fb", "Generic Attribute"],
    deviceInformation:                          ["0000180a-0000-1000-8000-00805f9b34fb", "Device Information"],
    accelerometerService:                       ["c75ea010-ede4-4ab4-8f96-17699ebaf1b8", "Accelerometer 1 Service"],
    accelerometer2Service:                        ["d75ea010-ede4-4ab4-8f96-17699ebaf1b8", "Accelerometer 2 Service"],
    gameballService:                            ["00766963-6172-6173-6f6c-7574696f6e73", "Gameball Service"],
    sensorStreamService:                        ["a54d785d-d674-4cda-b794-ca049d4e044b", "Sensor Stream Service"],
    capacitorService:                           ["f4ad0000-d674-4cda-b794-ca049d4e044b", "Capacitor Service"],

    /**
     * Characteristics
     */
     a1Config:  ["1006bd26-daad-11e5-b5d2-0a1d41d68578", "accelerometer_1_config"],
     a1Thresh:  ["1006bd28-daad-11e5-b5d2-0a1d41d68578", "accelerometer_1_threshold"],
     a1Data:    ["1006bfd8-daad-11e5-b5d2-0a1d41d68578", "accelerometer_1_data"],
     a1id:      ["bb64a6c3-3484-4479-abd2-46dff5bfc574", "accelerometer_1_id"],
     a2Config:  ["8f20fa52-dab9-11e5-b5d2-0a1d41d68578", "accelerometer_2_config"],
     a2Thresh:  ["8f20fa54-dab9-11e5-b5d2-0a1d41d68578", "accelerometer_2_threshold"],
     a2Data:    ["8f20fcaa-dab9-11e5-b5d2-0a1d41d68578", "accelerometer_2_data"],
     a2id:      ["a93d70c9-ed5d-4af1-b0ad-518176309dfb", "accelerometer_2_id"],
     magCom:    ["31696178-3630-4892-adf1-19a7437d052a", "magnetometer_command"],
     magData:   ["042eb337-d510-4ee7-943a-baeaa50b0d9e", "magnetometer_data"],
     magRate:   ["08588aac-e32e-4395-ab71-6508d9d00329", "magnetometer_rate"],
     magid:     ["ea1c2a4b-543c-4275-9cbe-890024d777eb", "magnetometer_id"],
     devTest:   ["8e894cbc-f3f8-4e6b-9a0b-7247598552ac", "device_test"],
     devReset:  ["01766963-6172-6173-6f6c-7574696f6e73", "device_reset"],
     devRef:    ["0d42d5d8-6727-4547-9a82-2fa4d4f331bd", "device_refresh_gatt"],
     devName:   ["7c019ff3-e008-4268-b6f7-8043adbb8c22", "device_name"],
     devCol:    ["822ec8e4-4d57-4e93-9fa7-d47ae7e941c0", "device_color"],
     sstream:   ["a54d785d-d675-4cda-b794-ca049d4e044b", "sensor_stream_config"],
     ssdata:    ["a54d785d-d676-4cda-b794-ca049d4e044b", "sensor_stream_data"],
     capV:      ["f4ad0001-d675-4cda-b794-ca049d4e044b", "capacitor_voltage"],
     capCharge: ["a59c6ade-5427-4afb-bfe4-74b21b7893a0", "capacitor_charging"],

    /**
     * Method that searches an UUID among the UUIDs of all the services and
     * characteristics and returns:
     * - in HTML blue color the name of the service/characteristic found.
     * - in HTML red color a message if the UUID has not been found.
     * @param uuid The service or characteristic UUID.
     * @param serviceOrCharacteristic True (or 1) if it is a service, and false
     * (or 0) if it is a characteristic.
     */
    searchUuid(uuid, serviceOrCharacteristic) {
        for (const key in gameballUuid) {
            if (uuid === gameballUuid[key][0]) {
                return "<font color='blue'>" + gameballUuid[key][1] + "</font>";
            }
        }
        if (serviceOrCharacteristic) {
            return "<font color='red'>Unknown Service</font>";
        } else {
            return "<font color='red'>Unknown Characteristic</font>";
        }
    },
}


// Core, Team, and Official extension classes should be registered statically with the Extension Manager.
// See: scratch-vm/src/extension-support/extension-manager.js
var accel = {"1": {"x": -1, "y": -1, "z": -1}, "2": {"x": -1, "y": -1, "z": -1}}
class GameballExt {    
    constructor (runtime) {
        /**
         * Store this for later communication with the Scratch VM runtime.
         * If this extension is running in a sandbox then `runtime` is an async proxy object.
         * @type {Runtime}
         */
        this.scratch_vm = runtime;
        this.scratch_vm.registerPeripheralExtension(EXTENSION_ID, this);
        this.scratch_vm.connectPeripheral(EXTENSION_ID, 0);
        
        this.robot = this;
        this.thresholdVals = {"low": 155, "medium": 138, "high": 133}
        this.accelerometer = {"1": {"x": -1, "y": -1, "z": -1}, "2": {"x": -1, "y": -1, "z": -1}}
        this.gameballs = {};
        this.connectedGameballs = ["---"];
        
        this._mStatus = 1;
        this._mDevice = null;
        this._mServices = null;

        this.lastConnectCheck = 0;
        this.chargeCharacteristic = null;
        
        this.scratch_vm.on('PROJECT_STOP_ALL', this.resetRobot.bind(this));
        this.scratch_vm.on('CONNECT_MICROBIT_ROBOT', this.connectToBLE.bind(this));

    }


    getConnectedGameballs () {
        // if (Object.keys(this.gameballs).length == 0) {
        return this.connectedGameballs
        // }
    }

    async _loop() {

    }

    resetRobot() {

      }


    /**
     * @return {object} This extension's metadata.
     */
    getInfo () {
        return {
            id: EXTENSION_ID,
            name: formatMessage({
                id: 'gameballExt',
                default: 'Play Impossible Gameball',
                description: 'Extension using BLE to communicate with the Play Impossible Gameball.'
            }),
            showStatusButton: true,
            blockIconURI: blockIconURI,
            menuIconURI: blockIconURI,

            blocks: [
                {
                    func: 'CONNECT_MICROBIT_ROBOT',
                    blockType: BlockType.BUTTON,
                    text: 'Connect Gameball'
                },
                {
                    opcode: 'readAccel',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'gameball.readAccel',
                        default: 'read accel [NUMBER] [AXIS]',
                        description: 'Get accelerometer reads from gameball'
                    }),
                    arguments: {
                        NUMBER: {
                            type: ArgumentType.String,
                            menu: "ACC_NUM",
                            defaultValue: "1",
                        },
                        AXIS: {
                            type: ArgumentType.String,
                            menu: "ACC_AXES",
                            defaultValue: 'x',
                        },
                    },
                },
                {
                    opcode: 'readMultiAccel',
                    blockType: BlockType.REPORTER,
                    text: formatMessage({
                        id: 'gameball.readMultiAccel',
                        default: 'acceleration [GAMEBALL] [NUMBER] [AXIS]',
                        description: 'Get accelerometer reads from gameball'
                    }),
                    arguments: {
                        GAMEBALL: {
                            type: ArgumentType.String,
                            menu: "GBS_CONNECTED",
                            defaultValue: this.getConnectedGameballs()[0],
                        },
                        NUMBER: {
                            type: ArgumentType.String,
                            menu: "ACC_NUM",
                            defaultValue: "1",
                        },
                        AXIS: {
                            type: ArgumentType.String,
                            menu: "ACC_AXES",
                            defaultValue: 'x',
                        },
                    },
                },
                {
                    opcode: "setThreshold",
                    blockType: BlockType.COMMAND,
                    text: formatMessage({
                        id: "gameball.setThreshold",
                        default: "set sensitivity [GAMEBALL] [OPTION]",
                        description: "Change gameball trigger threshold",
                    }),
                    arguments: {
                        GAMEBALL: {
                            type: ArgumentType.String,
                            menu: "GBS_CONNECTED",
                            defaultValue: this.getConnectedGameballs()[0],
                        },
                        OPTION: {
                            type: ArgumentType.STRING,
                            menu:"THRESH_OPTIONS",
                            defaultValue: "medium",
                        },
                    },
                },
            ],
            menus: {
                GBS_CONNECTED: "getConnectedGameballs",
                ACC_NUM: {
                    acceptReporters: true,
                    items: ['1', '2'],
                },
                ACC_AXES: {
                    acceptReporters: true,
                    items: ['x', 'y', 'z', 'strength'],
                },
                THRESH_OPTIONS: {
                    acceptReporters: true,
                    items: [ 'low', 'medium', 'high'],
                }
                // SONGS: {
                //     acceptReporters: false,
                //     items: _songs
                // },
                // COLORS: {
                //     acceptReporters: false,
                //     items: _colors
                // },
                // DIRS: {
                //     acceptReporters: false,
                //     items: _drive
                // },
                // TURNS: {
                //     acceptReporters: false,
                //     items: _turn
                // },
                // BUTTON_STATES: {
                //     acceptReporters: false,
                //     items: _button
                // },
                // LINE_STATES: {
                //     acceptReporters: false,
                //     items: _line_states
                // }
            }
        };
    }
    
    /* The following 4 functions have to exist for the peripherial indicator */
    connect() {
    }
    disconnect() {
    }
    scan() {
        
    }
    isConnected() {
        return (this._mStatus == 2);
    }
    
    onDeviceDisconnected() {
        console.log("Lost connection to robot");   
        this.scratch_vm.emit(this.scratch_vm.constructor.PERIPHERAL_DISCONNECTED);
        this._mDevice = null;
        this._mServices = null;
        this._mStatus = 1;
    }
    /*
    async connectLoop(capChar) {
        while (true) {
            var timeNow = new Date().getTime();
            if ((timeNow - 10000) > this.lastConnectCheck) {
                console.log("connect loop happening");
                cc = await capChar.readValue();
                ccVal = new Uint16Array(cc.buffer)[0] *(3/(2^12))
                console.log(ccVal);
            }
        } 

    }
    */
    async chargeRead(capCharacteristic) {

        // while (true) {
            // console.log("in this loop");
            // var timeNow = new Date().getTime();
            // if ((timeNow - 10000) > this.lastConnectCheck && cc != undefined) {
            //     console.log("connect loop happening");
            //     cc = await capCharacteristic.readValue();
            //     ccVal = new Uint16Array(cc.buffer)[0] *(3/(2^12))
            //     console.log(ccVal);
            //     this.lastConnectCheck = timeNow;
            // }
        // } 

        // console.log(capCharacteristic);
        cc = await capCharacteristic.readValue();
        ccVal = new Uint16Array(cc.buffer)[0] *(3/(2^12))
        console.log(ccVal);

        if (cc != undefined) {
            // console.log("calling againt");
            // this.connectLoop(capCharacteristic);
            // setTimeout(this.chargeRead, 10000, capCharacteristic);
        }
    }

    writeLedString(args) {
        let text = args.TEXT;
        console.log("Write led string: " + text);
        if (this._mServices) this._mServices.ledService.writeText(text);
    }

    async setThreshold(args) {
        args.GAMEBALL
        args.OPTION
        
        this.startAccel("accel1", Uint8Array.of(0x197), Uint16Array.of(this.thresholdVals[args.OPTION]), this.gameballs[args.GAMEBALL]["server"]);
    }

    getStrength(acc) {
        acc = Object.values(acc)
        strength = (acc[0]**2 + acc[1]**2 + acc[2]**2) ** 0.5
        // console.log(strength);
        return strength;
    }

    createChangeListener(event) {
        console.log(event);
        console.log(this);
        devName = this.devName
        return function (event, devName) {
            console.log(event)
            console.log(devName);
        }
    }

    handleDataChange(event) {
      tb = event.target.value.buffer;
      tba = new Uint16Array(tb);
      // console.log(tba);
      
      devName = event.target.service.device.name;
      // if (!(devName in this.context.gameballs)) {
        // if (this.context.connectedGameballs.indexOf("---") != -1) {
        //     this.context.connectedGameballs = [];
        // }
        // this.context.gameballs[devName] = {"1": {}, "2": {}};
        // this.context.gameballs[this.devName] = {"1": {"x": -1, "y": -1, "z": -1}, "2": {"x": -1, "y": -1, "z": -1}};
        // if (this.context.connectedGameballs.indexOf(devName) == -1){
        //     this.context.connectedGameballs.push(devName);
        // }
      // }

      accel["1"] =  {"x": tba[1] *0.008, "y": tba[2]*0.008, "z": tba[3]*0.008}
      accel["2"] = {"x": tba[4]*0.008, "y": tba[5]*0.008, "z": tba[6] *0.008};
      accel["1"]["strength"] = this.context.getStrength(accel["1"]);
      accel["2"]["strength"] = this.context.getStrength(accel["2"]);


      this.context.gameballs[devName]["1"] = {"x": tba[1] *0.008, "y": tba[2]*0.008, "z": tba[3]*0.008, "strength": this.context.getStrength(tba.slice(1,4)) * 0.008};
      this.context.gameballs[devName]["2"] = {"x": tba[4] *0.008, "y": tba[5]*0.008, "z": tba[6]*0.008, "strength": this.context.getStrength(tba.slice(1,4)) * 0.008};
      // console.log(this.context.gameballs);
      // console.log(this.accelerometer);
      pushObj = {};
      tba.map((c, index) => pushObj["a" + String(index)] = c);
      pushObj["time"] = new Date().getTime();
      pushObj["tag"] = -1;
      // printData.push(pushObj);
    }

    async readAccel(args) {
        // console.log(args)
        // console.log(this.accelerometer[args.DEVICE]);
        // console.log();
        // console.log(args.DIR);
        // if (args.DEVICE in this.accelerometer) {
            // console.log(this.accelerometer["1"]);
        return accel[args.NUMBER][args.AXIS];
        // }
        // else {
        //     return null;
        // }
    }

    async readMultiAccel(args) {
        if (args.GAMEBALL != "---") {
            return this.gameballs[args.GAMEBALL][args.NUMBER][args.AXIS];
        }
        else {
            return -1
        }
        
    }

    async startReadingData(ch, devName) {
        await ch.startNotifications();
        // await ch.addEventListener('characteristicvaluechanged', this.createChangeListener({"context": this, "devName": devName}));

        await ch.addEventListener('characteristicvaluechanged', this.handleDataChange.bind({"context": this, "devName": devName}));
        // console.log(ch);
        // console.log(ch[1], ch[2], ch[3]);
        
    }

    getCharId(charName) {
        return gameballUuid[charName][0];
    }

    async startAccel(accelName, settingsVal, thresholdVal, server) {
        var accelServices = {
            "accel1": {
                "service": "accelerometerService", 
                "settingsChar": "a1Config",
                "threshChar": "a1Thresh"
            }, 
            "accel2": {
                "service": "accelerometer2Service",
                "settingsChar": "a2Config",
                "threshChar": "a2Thresh"
            }
        };

        asa = accelServices[accelName];
        accelService = await server.getPrimaryService(this.getCharId(asa["service"]));
        acSetting = await accelService.getCharacteristic(this.getCharId(asa["settingsChar"]));
        acThresh = await accelService.getCharacteristic(this.getCharId(asa["threshChar"]));
        await acSetting.writeValue(settingsVal);
        await acThresh.writeValue(thresholdVal);
        return [acSetting, acThresh];
    }


    async startListening(device) {
        // console.log("starting to listen!!!");
        const server = await device.gatt.connect();
        this._mServices = await server.getPrimaryServices();
        const services = await server.getPrimaryServices();
        // console.log(server)
        gameService = await server.getPrimaryService(gameballUuid["gameballService"][0]);
        refreshCharacteristic = await gameService.getCharacteristic(gameballUuid["devRef"][0]);
        a1Chars = await this.startAccel("accel1", Uint8Array.of(0x197), Uint16Array.of(135), server);
        await this.startAccel("accel2", Uint8Array.of(0x647), Uint16Array.of(135), server);

        sService = await server.getPrimaryService("a54d785d-d674-4cda-b794-ca049d4e044b");
        streamChar = await sService.getCharacteristic("a54d785d-d675-4cda-b794-ca049d4e044b");
        capService = await server.getPrimaryService(gameballUuid["capacitorService"][0]);
        capCharacteristic = await capService.getCharacteristic(gameballUuid["capV"][0]);
        for (var x=1; x < 180; x++) {
            setTimeout(this.chargeRead, x*10000, capCharacteristic);    
        }

        await streamChar.writeValue(Uint8Array.of(3));
        streamRead = await sService.getCharacteristic("a54d785d-d676-4cda-b794-ca049d4e044b");
        let devName = String(Object.keys(this.gameballs).length);
        if (server.device.name) {
            devName = server.device.name;
        }
        if (this.connectedGameballs.indexOf("---") != -1) {
            this.connectedGameballs = [];
        }
        if (this.connectedGameballs.indexOf(devName) == -1){
            this.connectedGameballs.push(devName);
            this.gameballs[devName] = {"server": server, "1": {}, "2": {}};
        }
        this.startReadingData(streamRead, devName);
        console.log(services);
        return services;
    }
    
    async connectToBLE() {
        console.log("Getting BLE device");
        
        if (window.navigator.bluetooth) {
            try {
                // this._mDevice = await microbit.requestMicrobit(window.navigator.bluetooth);
                // this._mServices = await microbit.getServices(this._mDevice);

                const device = await navigator.bluetooth.requestDevice({
                    // To accept all devices, use acceptAllDevices: true and remove filters.
                    filters: [{namePrefix: "Gameball"}],
                    // acceptAllDevices: true,
                    optionalServices: [
                        gameballUuid.genericAccess[0], 
                        gameballUuid.genericAttribute[0], 
                        gameballUuid.deviceInformation[0], 
                        gameballUuid.accelerometerService[0], 
                        gameballUuid.accelerometer2Service[0], 
                        gameballUuid.gameballService[0], 
                        gameballUuid.sensorStreamService[0], 
                        gameballUuid.capacitorService[0]
                    ],
                })
                // console.log(device);
                this._mDevice = device;
                // console.log(this._mDevice);
                // var server = await this._mDevice.gatt.connect();
                
                // log('Connecting to GATT Server...');
                var cc;

                services = await this.startListening(device);
                console.log(this._mServices);
      
                if (this._mServices.deviceInformationService) {
                    this._mStatus = 2;            
                    this.scratch_vm.emit(this.scratch_vm.constructor.PERIPHERAL_CONNECTED);
    
                    if (this._mServices.uartService) {
                        this._mServices.uartService.addEventListener("receiveText", this.updateSensors.bind(this));
                        this._mDevice.addEventListener("gattserverdisconnected", this.onDeviceDisconnected.bind(this));
                    }
                }
            } catch(err) {
                console.log(err);
                if (err.message == "Bluetooth adapter not available.") alert("Your device does not support BLE connections. Please go to the robot setup instructions to install the Gizmo Robot Extension.");
            }
        } else {
            alert("Error trying to connect to BLE devices. Please try again.");
        }
    }
 
}
module.exports = GameballExt;
